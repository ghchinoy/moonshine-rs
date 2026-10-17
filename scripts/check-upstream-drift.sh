#!/usr/bin/env bash
# Checks upstream moonshine-ai/moonshine for drift against moonshine-rs:
#   1. Default MOONSHINE_VERSION pin in crates/moonshine-sys/build.rs vs.
#      latest published GitHub Release (and prebuilt binary asset availability).
#   2. Upstream git refs (main, latest semver tag, active dev-* branches) and
#      any commits touching core/ ahead of the pinned release.
#   3. Vendored C API header (crates/moonshine-sys/vendor/moonshine-c-api.h)
#      vs. upstream core/moonshine-c-api.h.
#   4. Local sibling C++ checkout (MOONSHINE_DIR or ../github/moonshine) status.
#
# Usage:
#   ./scripts/check-upstream-drift.sh [--strict]
#
# By default, exits 0 when the pinned release matches the latest published
# GitHub Release and the vendored header matches, even if an unreleased tag or
# dev-* branch exists upstream (reported as an informational notice).
# Pass --strict to exit 1 on any unreleased tag/dev-* branch or local checkout
# divergence as well.

set -euo pipefail

STRICT=0
if [[ "${1:-}" == "--strict" ]]; then
  STRICT=1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BUILD_RS="${REPO_DIR}/crates/moonshine-sys/build.rs"
VENDOR_HEADER="${REPO_DIR}/crates/moonshine-sys/vendor/moonshine-c-api.h"
UPSTREAM_REPO="moonshine-ai/moonshine"
UPSTREAM_GIT_URL="https://github.com/${UPSTREAM_REPO}.git"

DRIFT=0
NOTICE=0

echo "=== Checking Upstream Drift (${UPSTREAM_REPO}) ==="

# 1. Extract pinned MOONSHINE_VERSION from crates/moonshine-sys/build.rs
PINNED_TAG="$(sed -n 's/.*env::var("MOONSHINE_VERSION").*"\(v[^"]*\)".*/\1/p' "${BUILD_RS}" | head -n 1)"
if [[ -z "${PINNED_TAG}" ]]; then
  echo "ERROR: Could not parse default MOONSHINE_VERSION from ${BUILD_RS}" >&2
  exit 2
fi
echo "Pinned MOONSHINE_VERSION (build.rs): ${PINNED_TAG}"

# 2. Query latest published GitHub Release & git tags/branches
LATEST_RELEASE_TAG=""
if command -v gh >/dev/null 2>&1; then
  LATEST_RELEASE_TAG="$(gh release view --repo "${UPSTREAM_REPO}" --json tagName --jq .tagName 2>/dev/null || true)"
fi

if [[ -z "${LATEST_RELEASE_TAG}" ]]; then
  echo "WARNING: Could not query latest GitHub Release via 'gh'; falling back to git ls-remote tags."
fi

REMOTE_REFS="$(git ls-remote "${UPSTREAM_GIT_URL}" "refs/heads/main" "refs/heads/dev-*" "refs/tags/v*" 2>/dev/null || true)"
if [[ -z "${REMOTE_REFS}" ]]; then
  echo "ERROR: Failed to query upstream git refs from ${UPSTREAM_GIT_URL}" >&2
  exit 2
fi

MAIN_SHA="$(echo "${REMOTE_REFS}" | awk '$2 == "refs/heads/main" {print $1}')"
PINNED_SHA="$(echo "${REMOTE_REFS}" | awk -v ref="refs/tags/${PINNED_TAG}^{}" -v tag="refs/tags/${PINNED_TAG}" '$2 == ref {sha=$1} $2 == tag && !sha {sha=$1} END {print sha}')"
LATEST_GIT_TAG="$(echo "${REMOTE_REFS}" | awk '$2 ~ /^refs\/tags\/v[0-9]+\.[0-9]+\.[0-9]+$/ {sub("refs/tags/", "", $2); print $2}' | sort -V | tail -n 1)"
LATEST_GIT_TAG_SHA="$(echo "${REMOTE_REFS}" | awk -v ref="refs/tags/${LATEST_GIT_TAG}^{}" -v tag="refs/tags/${LATEST_GIT_TAG}" '$2 == ref {sha=$1} $2 == tag && !sha {sha=$1} END {print sha}')"

LATEST_DEV_LINE="$(echo "${REMOTE_REFS}" | awk '$2 ~ /^refs\/heads\/dev-v/ {sub("refs/heads/", "", $2); print $2, $1}' | sort -V -k1,1 | tail -n 1)"
LATEST_DEV_BRANCH="$(echo "${LATEST_DEV_LINE}" | awk '{print $1}')"
LATEST_DEV_SHA="$(echo "${LATEST_DEV_LINE}" | awk '{print $2}')"

echo "Upstream main branch:                ${MAIN_SHA:0:8}"
if [[ -n "${LATEST_RELEASE_TAG}" ]]; then
  echo "Latest published GitHub Release:     ${LATEST_RELEASE_TAG} (${PINNED_SHA:0:8})"
fi
echo "Latest git tag:                      ${LATEST_GIT_TAG} (${LATEST_GIT_TAG_SHA:0:8})"
if [[ -n "${LATEST_DEV_BRANCH}" ]]; then
  echo "Latest dev-* branch:                 ${LATEST_DEV_BRANCH} (${LATEST_DEV_SHA:0:8})"
fi
echo "---------------------------------------------------"

# Check 1: Published GitHub Release vs pinned tag
if [[ -n "${LATEST_RELEASE_TAG}" ]]; then
  if [[ "${PINNED_TAG}" == "${LATEST_RELEASE_TAG}" ]]; then
    echo "[PASS] Prebuilt pin (${PINNED_TAG}) matches latest published GitHub Release."
  else
    echo "[DRIFT] Prebuilt pin (${PINNED_TAG}) lags latest published GitHub Release (${LATEST_RELEASE_TAG})."
    DRIFT=1
  fi
fi

# Check 2: Unreleased git tag or dev-* branch ahead of pinned tag
TARGET_REF="${PINNED_TAG}"
if [[ -n "${LATEST_GIT_TAG}" && "${LATEST_GIT_TAG}" != "${PINNED_TAG}" ]]; then
  # Check whether this git tag has a published release with macOS/Linux assets
  ASSET_URL="https://github.com/${UPSTREAM_REPO}/releases/download/${LATEST_GIT_TAG}/moonshine-voice-macos-arm64.tar.gz"
  if curl -sSLf -I "${ASSET_URL}" >/dev/null 2>&1; then
    echo "[DRIFT] Tag ${LATEST_GIT_TAG} has published prebuilt release assets at ${ASSET_URL}!"
    DRIFT=1
  else
    echo "[INFO] Tag ${LATEST_GIT_TAG} (${LATEST_GIT_TAG_SHA:0:8}) exists in git, but prebuilt release assets are NOT yet published (keep build.rs pin at ${PINNED_TAG})."
    NOTICE=1
  fi
  TARGET_REF="${LATEST_GIT_TAG}"
fi

if [[ -n "${LATEST_DEV_BRANCH}" && "${LATEST_DEV_SHA}" != "${PINNED_SHA}" ]]; then
  echo "[INFO] Active upstream branch ${LATEST_DEV_BRANCH} (${LATEST_DEV_SHA:0:8}) is ahead of ${PINNED_TAG}."
  TARGET_REF="${LATEST_DEV_BRANCH}"
  NOTICE=1
fi

if [[ "${TARGET_REF}" != "${PINNED_TAG}" ]] && command -v gh >/dev/null 2>&1; then
  echo ""
  echo "--- Upstream core/ changes between ${PINNED_TAG} and ${TARGET_REF} ---"
  CORE_FILES="$(gh api "repos/${UPSTREAM_REPO}/compare/${PINNED_TAG}...${TARGET_REF}" \
    --jq '.files[] | select(.filename | startswith("core/")) | "  \(.status)\t\(.filename) (+\(.additions)/-\(.deletions))"' 2>/dev/null || true)"
  if [[ -n "${CORE_FILES}" ]]; then
    echo "${CORE_FILES}"
  else
    echo "  (no files in core/ modified)"
  fi
fi

# Check 3: Vendored C API header vs upstream core/moonshine-c-api.h
echo ""
echo "--- Checking vendored moonshine-c-api.h ---"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

for CHECK_REF in "${PINNED_TAG}" "${TARGET_REF}"; do
  # Avoid duplicate check if TARGET_REF == PINNED_TAG
  if [[ "${CHECK_REF}" == "${TARGET_REF}" && "${TARGET_REF}" == "${PINNED_TAG}" && -f "${WORK_DIR}/checked_pinned" ]]; then
    continue
  fi
  touch "${WORK_DIR}/checked_pinned"

  RAW_URL="https://raw.githubusercontent.com/${UPSTREAM_REPO}/${CHECK_REF}/core/moonshine-c-api.h"
  UPSTREAM_HEADER="${WORK_DIR}/moonshine-c-api-${CHECK_REF//\//_}.h"
  if curl -sSLf -o "${UPSTREAM_HEADER}" "${RAW_URL}" 2>/dev/null; then
    if diff -u "${VENDOR_HEADER}" "${UPSTREAM_HEADER}" > "${WORK_DIR}/header.diff"; then
      echo "[PASS] crates/moonshine-sys/vendor/moonshine-c-api.h is identical to ${CHECK_REF}."
    else
      echo "[DRIFT] crates/moonshine-sys/vendor/moonshine-c-api.h differs from ${CHECK_REF}:"
      head -n 40 "${WORK_DIR}/header.diff"
      DRIFT=1
    fi
  else
    echo "[WARN] Could not fetch ${RAW_URL} to compare header."
  fi
done

# Check 4: Local C++ source checkout (if present)
echo ""
echo "--- Checking local C++ checkout ---"
LOCAL_MOONSHINE_DIR="${MOONSHINE_DIR:-}"
if [[ -z "${LOCAL_MOONSHINE_DIR}" ]]; then
  for candidate in \
    "${REPO_DIR}/../moonshine" \
    "${REPO_DIR}/../github/moonshine" \
    "${REPO_DIR}/../../github/moonshine"; do
    if [[ -f "${candidate}/core/moonshine-c-api.h" ]]; then
      LOCAL_MOONSHINE_DIR="$(cd "${candidate}" && pwd)"
      break
    fi
  done
fi

if [[ -n "${LOCAL_MOONSHINE_DIR}" && -d "${LOCAL_MOONSHINE_DIR}/.git" ]]; then
  LOCAL_SHA="$(git -C "${LOCAL_MOONSHINE_DIR}" rev-parse HEAD)"
  LOCAL_DESC="$(git -C "${LOCAL_MOONSHINE_DIR}" describe --tags --always --dirty 2>/dev/null || echo "${LOCAL_SHA:0:8}")"
  LOCAL_BRANCH="$(git -C "${LOCAL_MOONSHINE_DIR}" rev-parse --abbrev-ref HEAD)"
  echo "Local checkout found: ${LOCAL_MOONSHINE_DIR}"
  echo "  Branch/Ref: ${LOCAL_BRANCH} @ ${LOCAL_SHA:0:8} (${LOCAL_DESC})"
  if [[ "${LOCAL_SHA}" == "${LATEST_GIT_TAG_SHA}" || "${LOCAL_SHA}" == "${LATEST_DEV_SHA}" ]]; then
    echo "[PASS] Local checkout is at latest upstream tag/branch (${LOCAL_DESC})."
  elif [[ "${LOCAL_SHA}" == "${PINNED_SHA}" ]]; then
    echo "[INFO] Local checkout is at pinned release ${PINNED_TAG} (${LOCAL_SHA:0:8}); newer upstream tag ${LATEST_GIT_TAG} (${LATEST_GIT_TAG_SHA:0:8}) is available."
    NOTICE=1
  else
    echo "[INFO] Local checkout is at ${LOCAL_SHA:0:8} (pinned=${PINNED_SHA:0:8}, latest_tag=${LATEST_GIT_TAG_SHA:0:8})."
    NOTICE=1
  fi
else
  echo "No local C++ checkout detected (builds will use prebuilt release ${PINNED_TAG})."
fi

echo "==================================================="
if [[ "${DRIFT}" -ne 0 ]]; then
  echo "STATUS: DRIFT_DETECTED"
  exit 1
elif [[ "${STRICT}" -ne 0 && "${NOTICE}" -ne 0 ]]; then
  echo "STATUS: UPSTREAM_AHEAD (strict mode)"
  exit 1
else
  echo "STATUS: IN_SYNC"
  exit 0
fi
