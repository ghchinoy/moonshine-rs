# Tauri v2 + Lit Web Components Demo App

A minimal, cross-platform desktop application demonstrating on-device Speech-to-Text using [`moonshine-rs`](https://github.com/ghchinoy/moonshine-rs), Tauri v2, and Lit Web Components (TypeScript).

## Features

- **1. Model Picker & In-App Downloader**: Browse local model directories or auto-download the `tiny-en` quantized model directly from `download.moonshine.ai` with live download progress.
- **2. Live Microphone Dictation**: Capture audio from your microphone using Web Audio API and stream PCM samples to the `moonshine-rs` Rust backend.
- **3. Multi-Format File Transcription**: Drag-and-drop or select any audio file (MP3, WAV, AAC, FLAC, OGG, M4A, CAF). Automatically decoded and resampled to 16kHz mono via `symphonia` and `rubato`.
- **4. Transcript View**: Render formatted transcript lines with timestamps and a copy-to-clipboard button.

## Architecture

```text
demo/tauri-mic-transcriber/
├── src/                          # Frontend (Lit Web Components + TypeScript)
│   ├── components/
│   │   ├── model-picker.ts       # Directory selection & in-app CDN downloader
│   │   ├── mic-recorder.ts       # Web Audio API microphone capture
│   │   ├── file-drop.ts          # Multi-format audio file drag-and-drop
│   │   ├── transcript-view.ts    # Formatted line display & clipboard copy
│   │   └── demo-app.ts           # Main layout component
│   └── styles.css
└── src-tauri/                    # Tauri v2 Backend (Rust)
    ├── src/
    │   ├── main.rs               # Application entry & handler registration
    │   └── commands.rs           # #[tauri::command] handlers invoking moonshine-rs
    └── Cargo.toml                # Uses path dependency: moonshine-rs
```

## Setup & Running

### Prerequisites

- Node.js ≥ 18 and `npm` or `pnpm`
- Rust toolchain (edition 2021)
- *(Optional)* Set `MOONSHINE_DIR` if you want to build `libmoonshine` from a local custom C++ source tree. Otherwise, prebuilt official release binaries are downloaded automatically.

### Commands

1. **Install dependencies**:
   ```bash
   cd demo/tauri-mic-transcriber
   npm install
   ```

2. **Run in development mode**:
   ```bash
   npx @tauri-apps/cli dev
   ```

3. **Build standalone application**:
   ```bash
   npx @tauri-apps/cli build
   ```
