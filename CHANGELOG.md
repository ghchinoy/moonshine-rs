# Changelog

All notable changes to `moonshine-rs` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-08-08

### Added

- **Real-Time Streaming Transcription API**:
  - Added `TranscriberStream` RAII streaming session wrapper and `Transcriber::create_stream()`.
  - Added `add_audio(pcm, sample_rate)`, `poll(force)`, `restart()`, and `finalize()` methods on `TranscriberStream` mapping to the C library's multi-function streaming lifecycle.
  - Surfaced streaming metadata flags on `TranscriptLine`: `is_updated`, `is_new`, `has_text_changed`, `have_speakers_changed`, and `last_transcription_latency_ms`.
  - Added `stream_transcribe` runnable example demonstrating real-time PCM chunk ingestion and partial/final line updates using streaming models (`tiny-streaming`, `base-streaming`).
  - Added `download_model` support for downloading streaming model architectures (`tiny-streaming`, `base-streaming`).

## [0.1.5] - 2026-08-08

### Added

- **In-Memory Model Loading**:
  - Added `Transcriber::from_memory_files(arch, files, options)` allowing transcribers to be initialized directly from in-memory byte buffers (`encoder_model.ort`, `decoder_model_merged.ort`, `tokenizer.bin`, etc.) without requiring disk files.
  - Automatically handles speaker diarization model dependencies when `with_identify_speakers(true)` is set.

### Fixed

- **Demo App Packaging**:
  - Regenerated `demo/tauri-mic-transcriber/src-tauri/icons/icon.icns` as a valid multi-resolution macOS ICNS container (via `sips`/`iconutil`) to prevent packaging issues when building macOS app bundles.

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
