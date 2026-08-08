# Live Microphone Streaming Terminal Demo (`stream-cli`)

A real-time terminal application demonstrating live microphone audio capture and streaming speech-to-text using `cpal` and `moonshine-rs`.

## Quick Start

### 1. Download a Streaming Model

Download a streaming model (e.g. `tiny-streaming`, `small-streaming`, or `medium-streaming`) using the built-in `download_model` example:

```bash
cargo run --example download_model -p moonshine-rs -- ./models/tiny-streaming en tiny-streaming
```

Or using [`just`](https://github.com/casey/just) (defaults to `tiny-streaming`, or pass `arch=small-streaming` / `arch=medium-streaming`):

```bash
just download-streaming
# Or to download medium-streaming:
just download-streaming arch=medium-streaming dir=./models/medium-streaming
```

### 2. Run the Stream CLI

Pass the path to your downloaded streaming model directory:

```bash
cargo run -p stream-cli -- ./models/tiny-streaming
```

Or using `just`:

```bash
just stream-cli
```

## How It Works

1. **Audio Capture**: Uses `cpal` to select the default system microphone, capturing audio chunks and downmixing to 16 kHz mono `f32` PCM.
2. **Streaming Transcriber**: Creates an `OwnedTranscriberStream` via `Transcriber::create_owned_stream()`.
3. **Real-Time Polling**: Ingests PCM audio chunks via `add_audio` and polls for updates every 200ms using `poll(false)`.
4. **Terminal Output**:
   - `[LIVE ]`: Partial transcript lines as speech is actively being recognized.
   - `[FINAL]`: Completed transcript lines.
5. **Clean Shutdown**: Listens for `Ctrl+C` via `ctrlc`, stops the stream, and calls `poll(true)` to print the final complete transcript.

## System Notes & Permissions

- **Microphone Permission**: On macOS or Linux, your terminal application (e.g. iTerm2, Terminal.app) must be granted microphone access when prompted.
- **Model Requirement**: Requires a **streaming architecture** model (such as `tiny-streaming-en`, `small-streaming-en`, or `medium-streaming-en`). Non-streaming batch models like `tiny-en` or `base-en` will fail to load as a streaming transcriber.
