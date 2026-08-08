# moonshine-rs task runner. Install `just`: https://github.com/casey/just
#
# Run `just` (or `just --list`) to see available recipes.

# Default model location used by the transcribe/example recipes.
model_dir := "./models/tiny-en"
streaming_model_dir := "./models/tiny-streaming"

# List available recipes.
default:
    @just --list

# Build the whole workspace.
build:
    cargo build --workspace

# Run all tests, including doctests.
test:
    cargo test --workspace

# Build and open the API docs.
doc:
    cargo doc --no-deps -p moonshine-rs --open

# Format and lint.
check:
    cargo fmt --all -- --check
    cargo clippy --workspace --all-targets -- -D warnings

# Download the tiny-en model into {{model_dir}} (override: `just model_dir=... download`).
download:
    cargo run --example download_model -p moonshine-rs -- {{model_dir}}

# Transcribe an audio file with the downloaded model. Usage: `just transcribe path/to/audio.wav`
transcribe audio:
    cargo run --example transcribe_file -p moonshine-rs -- {{model_dir}} {{audio}}

# Run any example by name. Usage: `just example browse_catalog` or `just example transcribe_file "./m ./a.wav"`
example name args="":
    cargo run --example {{name}} -p moonshine-rs -- {{args}}

# Build every example (used in CI to prevent example rot).
examples:
    cargo build --examples -p moonshine-rs

# Download a streaming model into {{streaming_model_dir}}.
# Usage: `just download-streaming arch=medium-streaming dir=./models/medium-streaming`
# Valid arch values: tiny-streaming (default), small-streaming, medium-streaming, base-streaming (unpublished upstream).
download-streaming arch="tiny-streaming" dir=streaming_model_dir:
    cargo run --example download_model -p moonshine-rs -- {{dir}} en {{arch}}

# Run the live microphone streaming terminal demo. Usage: `just stream-cli [model_dir]`
stream-cli dir=streaming_model_dir:
    cargo run -p stream-cli -- {{dir}}

# Run the Tauri + Lit desktop demo.
demo:
    cd demo/tauri-mic-transcriber && npm install && npx @tauri-apps/cli dev
