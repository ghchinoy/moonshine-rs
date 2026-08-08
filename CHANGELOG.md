# Changelog

All notable changes to `moonshine-rs` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4] - 2026-08-08

### Added

- **Upstream Moonshine Voice v0.1.1 support**:
  - Updated `MOONSHINE_VERSION` default pin in `moonshine-sys/build.rs` to `v0.1.1`.
  - Refreshed vendored C API header (`moonshine-c-api.h`) to match v0.1.1.
- **Automatic Speaker Diarization Model Downloads**:
  - Added `ensure_diarization_models_downloaded()` and `get_diarization_dependencies()` to resolve and fetch the required speaker diarization models (`segmentation.ort` and `embedding.ort`, ~8.2 MB) on demand.
  - Automatically fetches diarization models on first use when `TranscriberOptions::with_identify_speakers(true)` is enabled, caching them in the OS cache directory (`~/.cache/moonshine-rs/diarization` / `MOONSHINE_RS_CACHE_DIR`).
  - Added `TranscriberOptions::with_diarization_model_dir(path)` to allow explicit custom model paths.
- **Speculative Decoding Toggle**:
  - Added `TranscriberOptions::with_speculative_decoding(bool)` option (default `true` upstream) to control speculative re-decoding on streaming updates.

### Changed

- **C API FFI**:
  - Updated bindgen FFI bindings to reflect upstream's Intent-to-Embedding API rename (`moonshine_create_embedding_model`, `moonshine_get_embedding_dependencies`, etc.).
