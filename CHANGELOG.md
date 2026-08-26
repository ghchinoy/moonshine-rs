# Changelog

All notable changes to `moonshine-rs` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.5] - 2026-08-25

### Added

- **TTS Model Downloader Example (`download_tts_model`)**:
  - Added `examples/download_tts_model.rs` for downloading complete TTS vocoder and G2P asset bundles directly from `download.moonshine.ai`.
  - Added `just download-tts` recipe supporting configurable voices (e.g. Kokoro, Piper).
  - Automatically manages nested directory structures (`kokoro/...`, `en_us/...`).

## [0.2.4] - 2026-08-25

### Added

- **Text-to-Speech (TTS) & Streaming Synthesis Module (`moonshine_rs::tts`)**:
  - Added `TtsSynthesizer` for on-device voice synthesis (Kokoro, Piper, ZipVoice).
  - Added one-shot audio synthesis methods: `synthesize(text)` and `synthesize_phonemes(phonemes)`.
  - Added pull-based, synchronous real-time streaming synthesis for LLM token streams: `push_text(tokens)`, `flush()`, `end_input()`, `cancel()`, `is_streaming()`, and `next_chunk()`.
  - Added `split_utterances` sentence segmentation helper preserving honorifics, abbreviations, and language-specific terminators.
  - Added voice discovery and dependency catalog queries: `get_tts_voices`, `get_tts_dependencies`, and `get_g2p_dependencies`.
  - Added `GraphemeToPhonemizer` for converting text to IPA phonemes.
  - Added runnable example `examples/text_to_speech.rs`.

## [0.2.3] - 2026-08-25

### Changed

- **Upstream C API & Prebuilt Release Pin (v0.1.5)**:
  - Bumped prebuilt release binary download fallback tag in `moonshine-sys/build.rs` to upstream release `v0.1.5`.
  - Refreshed vendored C API header (`vendor/moonshine-c-api.h`) from upstream, picking up new streaming TTS functions, updated constants, and catalog expansions.
  - Inherited upstream bugfix where `moonshine_transcribe_stream` after `moonshine_stop_stream` now reliably flushes and finalizes all remaining audio buffer frames even without prior interim polls.
  - Inherited upstream mmap memory leak fix on `Transcriber` destruction.

## [0.2.2] - 2026-08-13

### Added

- **Domain Customization and Keyterm Biasing API**:
  - Wrapped upstream `moonshine_transcriber_set_keyterms` and `moonshine_transcriber_set_context` C API functions.
  - Added `TranscriberOptions::with_keyterms(terms)`, `TranscriberOptions::with_keyterm_boost(boost)`, `TranscriberOptions::with_context(context)`, and `TranscriberOptions::with_context_max_terms(max_terms)`.
  - Added `set_keyterms` and `set_context` methods on `Transcriber`, `TranscriberStream`, and `OwnedTranscriberStream` for dynamic mid-stream keyword biasing.
  - Added runnable example `examples/keyterm_biasing.rs`.
- **Tauri Desktop Demo Enhancements**:
  - Added floating always-on-top dictation overlay window with live 16-band FFT audio visualizer.
  - Added global push-to-talk hotkey (`Option+Space` / `Alt+Space`) and automatic clipboard paste insertion via `enigo` & `arboard`.
  - Added poisoned-mutex recovery and 5-minute idle model unloading.

### Fixed

- **Tauri Demo macOS Stability & Capabilities**:
  - Dispatched `enigo` simulated keystrokes to macOS main thread to eliminate `SIGTRAP` keyboard-layout assertion crashes.
  - Added `"overlay"` window to Tauri capabilities and granted `core:window:allow-start-dragging` for borderless window drag-repositioning.
  - Fixed overlay transcript container auto-scrolling to show live incoming text updates.

### Changed

- **Upstream C API & Prebuilt Release Pin**:
  - Bumped prebuilt release binary download fallback tag in `moonshine-sys/build.rs` to upstream release `v0.1.2`.
  - Refreshed vendored C API header (`vendor/moonshine-c-api.h`) from upstream.

## [0.2.1] - 2026-08-08

### Added

- **`OwnedTranscriberStream` API**:
  - Added `OwnedTranscriberStream` session handle and `Transcriber::create_owned_stream(self: Arc<Self>)` method to support thread-safe streaming across async tasks and application state without lifetime parameters.
- **Microphone Streaming CLI Demo**:
  - Added `demo/stream-cli` runnable workspace crate demonstrating live real-time microphone transcription using `cpal` audio input and `OwnedTranscriberStream`.
- **Tauri Live Streaming Integration**:
  - Updated `demo/tauri-mic-transcriber` with live streaming commands (`start_stream`, `feed_stream_pcm`, `stop_stream`), updating `mic-recorder` component to feed audio in real-time.

### Fixed

- **Model Download Catalog**:
  - Fixed streaming model architecture options in Tauri demo model picker and dependency resolver to match published Moonshine CDN architectures (`tiny-streaming`, `small-streaming`, `medium-streaming`).

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
