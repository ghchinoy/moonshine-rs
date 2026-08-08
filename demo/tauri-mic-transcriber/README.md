# Tauri v2 + Lit Web Components Demo App

A cross-platform desktop dictation application demonstrating on-device speech-to-text using [`moonshine-rs`](https://github.com/ghchinoy/moonshine-rs), Tauri v2, and Lit Web Components (TypeScript).

## Features

- **1. Model Picker & In-App Downloader**: Browse local model directories or auto-download quantized models (`tiny-en`, `tiny-streaming-en`, `small-streaming-en`, `medium-streaming-en`) directly from `download.moonshine.ai` with live progress bars.
- **2. Live Microphone Dictation & Global Hotkey**:
  - Global Push-to-Talk / Toggle hotkey (`Option+Space` / `Alt+Space`) active system-wide.
  - Real-time streaming PCM ingestion using `OwnedTranscriberStream`.
- **3. Auto-Paste to Active App**: Automatically inserts transcribed text directly into the focused text area via simulated keystrokes (`enigo`), closing the loop for hands-free dictation.
- **4. 16-Band FFT Waveform Visualizer**: Live log-spaced spectral energy bars computed via `rustfft` during microphone recording.
- **5. Floating Dictation Overlay Window**: Always-on-top, borderless overlay window (`overlay.html`) displaying animated waveform levels and live streaming transcripts.
- **6. Multi-Format File Transcription**: Drag-and-drop or select any audio file (MP3, WAV, AAC, FLAC, OGG, M4A). Automatically decoded and resampled to 16kHz mono via `symphonia` and `rubato`.
- **7. Robust Resource Management**:
  - Poisoned-mutex recovery on all state accesses.
  - Automatic 5-minute idle model unloading to free up system RAM.

## Architecture

```text
demo/tauri-mic-transcriber/
├── src/                          # Frontend (Lit Web Components + TypeScript)
│   ├── components/
│   │   ├── model-picker.ts       # Directory selection & in-app CDN downloader
│   │   ├── mic-recorder.ts       # Live mic capture, global hotkey listener & waveform
│   │   ├── file-drop.ts          # Multi-format audio file drag-and-drop
│   │   ├── transcript-view.ts    # Formatted line display, copy & auto-paste buttons
│   │   ├── overlay-app.ts        # Floating overlay window UI (waveform + streaming text)
│   │   └── demo-app.ts           # Main layout component
│   ├── styles.css
│   └── overlay-main.ts           # Overlay window entry script
├── overlay.html                  # Always-on-top overlay page
└── src-tauri/                    # Tauri v2 Backend (Rust)
    ├── src/
    │   ├── main.rs               # App setup, global shortcut registration & command routing
    │   ├── commands.rs           # #[tauri::command] handlers, auto-paste & idle unload
    │   ├── audio_viz.rs          # 16-band log-spaced FFT calculation (rustfft)
    │   └── overlay.rs            # Floating overlay window manager
    └── Cargo.toml                # Uses path dependency: moonshine-rs
```

## Setup & Running

### Prerequisites

- Node.js ≥ 18 and `npm` or `pnpm`
- Rust toolchain (edition 2021)

### Commands

1. **Install dependencies**:
   ```bash
   cd demo/tauri-mic-transcriber
   npm install
   ```

2. **Run in development mode**:
   ```bash
   npx @tauri-apps/cli dev
   # or from repo root:
   just demo
   ```

3. **Build standalone application**:
   ```bash
   npx @tauri-apps/cli build
   ```
