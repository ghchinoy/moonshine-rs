# moonshine-rs

Idiomatic Rust wrapper for [Moonshine Voice](https://github.com/moonshine-ai/moonshine) — fast, on-device speech-to-text (STT) and text-to-speech (TTS) powered by ONNX Runtime.

[![crates.io](https://img.shields.io/crates/v/moonshine-rs.svg)](https://crates.io/crates/moonshine-rs)
[![docs.rs](https://docs.rs/moonshine-rs/badge.svg)](https://docs.rs/moonshine-rs)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/License-MIT%20OR%20Apache--2.0-blue.svg)](#license)

`moonshine-rs` provides high-level, memory-safe Rust bindings to the official `libmoonshine` C API. By default it fetches official prebuilt `libmoonshine` binaries at build time (or compiles from source via `MOONSHINE_DIR`), and includes multi-format audio decoding (MP3, WAV, AAC, FLAC, OGG, M4A) with automatic 16kHz resampling.

## Features

- **On-Device STT**: Transcribe audio locally using quantized Moonshine models (`tiny-en`, `base-en`, `tiny-streaming`, `small-streaming`, `medium-streaming`).
- **Real-Time Streaming**: Low-latency incremental speech recognition with `TranscriberStream` & `OwnedTranscriberStream`.
- **Domain Customization**: Dynamically bias recognition towards specialized vocabularies, technical jargon, and contact/product names without model retraining (`with_keyterms`, `with_context`, `set_keyterms`, `set_context`).
- **Text-to-Speech (TTS) & G2P**: On-device voice synthesis across **Kokoro**, **Piper**, **ZipVoice**, and **Phonon** engines with one-shot synthesis, LLM token streaming (`push_text` / `next_chunk`), and utterance splitting.
- **Speaker Diarization & Word Timestamps**: Built-in speaker attribution (`with_identify_speakers`, auto-cached diarization models) and per-word timing/confidence.
- **In-Memory Model Loading**: Initialize STT (`Transcriber::from_memory_files`) and TTS (`TtsSynthesizer::from_memory`) directly from embedded byte buffers.
- **Multi-Format Audio**: Direct decoding and 16kHz resampling for MP3, WAV, AAC, FLAC, OGG, and M4A audio files via `moonshine_rs::audio`.
- **Safe API**: Typed errors, automatic resource management (`Drop`), and `Send + Sync` handles.

## Installation

Add `moonshine-rs` to your `Cargo.toml`:

```toml
[dependencies]
moonshine-rs = "0.2"
```

### Building

By default, `moonshine-rs` downloads official prebuilt `libmoonshine` binaries
from [moonshine-ai/moonshine GitHub Releases](https://github.com/moonshine-ai/moonshine/releases)
during `cargo build` — **no C++ toolchain, CMake, or source checkout required**:

```bash
cargo add moonshine-rs
cargo build
```

Platform notes for the prebuilt path:

- **macOS (arm64)**: `libmoonshine.a` with ONNX Runtime statically merged in — the resulting binary is fully self-contained.
- **Linux / Windows**: dynamically linked; the `.so` / `onnxruntime.dll` ships alongside your binary.

To build from source instead (fully static Linux/Windows binaries, or a custom
C++ tree), set `MOONSHINE_DIR` to a local checkout — this requires CMake ≥ 3.22
and a C++20 compiler:

```bash
git clone https://github.com/moonshine-ai/moonshine.git
export MOONSHINE_DIR=/path/to/moonshine
cargo build
```

See the [User Guide](https://github.com/ghchinoy/moonshine-rs/blob/main/docs/user-guide.md)
for the full build matrix and troubleshooting.

## Quick Start Example

```rust
use std::path::Path;
use moonshine_rs::{ModelArch, Transcriber, TranscriberOptions};
use moonshine_rs::audio::load_audio_for_transcription;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Decode and resample any audio file (MP3, WAV, AAC, FLAC, etc.) to 16kHz mono PCM
    let pcm_data = load_audio_for_transcription("audio.mp3")?;

    // 2. Load transcriber with model files
    let model_dir = Path::new("./models/tiny-en");
    let options = TranscriberOptions::new();
    let transcriber = Transcriber::from_files(model_dir, ModelArch::Tiny, Some(&options))?;

    // 3. Transcribe audio
    let transcript = transcriber.transcribe(&pcm_data, 16000)?;

    // 4. Print transcript
    for line in &transcript.lines {
        println!("[{:.2}s - {:.2}s] {}", line.start_time, line.start_time + line.duration, line.text);
    }

    Ok(())
}
```

### Domain Customization & Keyterm Biasing

Bias streaming recognition towards specialized terms and proper nouns at runtime:

```rust
use moonshine_rs::{ModelArch, Transcriber, TranscriberOptions};

// 1. Configure initial keyterms and boost
let options = TranscriberOptions::new()
    .with_keyterms("Kubernetes,Ceph,etcd")
    .with_keyterm_boost(2.5);

let transcriber = Transcriber::from_files(
    "./models/tiny-streaming",
    ModelArch::TinyStreaming,
    Some(&options),
)?;

let mut stream = transcriber.create_stream()?;

// 2. Or switch terms mid-stream without reloading models:
stream.set_keyterms("Rust,Tokio,Tauri")?;
```

### Text-to-Speech (TTS) Synthesis

Synthesize text to audio on-device using **Kokoro**, **Piper**, **ZipVoice**, or **Phonon**:

```rust
use moonshine_rs::{TtsOptions, TtsStreamStatus, TtsSynthesizer};

// Use Kokoro ("kokoro_af_heart"), Piper ("piper_en_US-lessac-medium"),
// ZipVoice ("zipvoice_american_female"), or Phonon ("phonon_zoey"):
let options = TtsOptions::new()
    .with_voice("phonon_zoey")
    .with_phonon_temperature(0.0);
let synth = TtsSynthesizer::from_files("en", "./models/tts/phonon", Some(&options))?;

// One-shot synthesis (returns raw mono f32 PCM in `[-1.0, 1.0]`)
let audio = synth.synthesize("Hello from Moonshine Voice!", None)?;
println!("Generated {} audio samples at {} Hz", audio.pcm.len(), audio.sample_rate);

// Or stream LLM tokens incrementally:
synth.push_text("Streaming speech synthesis ")?;
synth.push_text("with low time-to-first-audio.")?;
synth.end_input()?;
while let TtsStreamStatus::Chunk(chunk) = synth.next_chunk()? {
    println!("Chunk: {} samples (final={})", chunk.pcm.len(), chunk.is_final);
}
```

> **Audio Output**: `audio.pcm` contains in-memory float samples. Save to WAV using [`hound`](https://crates.io/crates/hound) (see `examples/text_to_speech.rs`) or play in real-time with [`cpal`](https://crates.io/crates/cpal) or [`rodio`](https://crates.io/crates/rodio).

## Moonshine Models & Assets

- **Hugging Face Model Hub**: [https://huggingface.co/UsefulSensors](https://huggingface.co/UsefulSensors)
- **Model CDN & Catalog Manifests**: [download.moonshine.ai](https://download.moonshine.ai)

## License

Dual-licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](https://github.com/ghchinoy/moonshine-rs/blob/main/LICENSE-APACHE) or <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT License ([LICENSE-MIT](https://github.com/ghchinoy/moonshine-rs/blob/main/LICENSE-MIT) or <http://opensource.org/licenses/MIT>)

at your option.

## Documentation

For an in-depth developer guide, see the [User Guide](https://github.com/ghchinoy/moonshine-rs/blob/main/docs/user-guide.md).
