import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

@customElement("moonshine-file-drop")
export class MoonshineFileDrop extends LitElement {
  static styles = css`
    :host {
      display: block;
      background-color: var(--panel-bg, #1e293b);
      border: 1px solid var(--border-color, #334155);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }

    h2 {
      font-size: 1.1rem;
      margin-bottom: 12px;
      color: var(--accent-color, #38bdf8);
    }

    .drop-zone {
      border: 2px dashed var(--border-color, #334155);
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background-color 0.2s;
    }

    .drop-zone:hover {
      border-color: var(--accent-color, #38bdf8);
      background-color: rgba(56, 189, 248, 0.05);
    }

    .drop-title {
      font-size: 1rem;
      font-weight: 500;
      margin-bottom: 6px;
    }

    .drop-sub {
      font-size: 0.85rem;
      color: var(--text-muted, #94a3b8);
    }

    .status-text {
      font-size: 0.85rem;
      color: var(--text-muted, #94a3b8);
      margin-top: 12px;
    }
  `;

  @property({ type: Boolean }) modelLoaded = false;

  @state() private isTranscribing = false;
  @state() private statusText = "Select or drop an audio file (MP3, WAV, AAC, FLAC, OGG, M4A).";

  async selectFile() {
    if (!this.modelLoaded) {
      this.statusText = "Please load a model first.";
      return;
    }

    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Audio Files",
            extensions: ["mp3", "wav", "aac", "flac", "ogg", "m4a", "caf"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        await this.transcribeFile(selected);
      }
    } catch (e: any) {
      this.statusText = `Error selecting file: ${e}`;
    }
  }

  private async transcribeFile(filePath: string) {
    this.isTranscribing = true;
    this.statusText = `Decoding and transcribing: ${filePath}...`;

    const startTime = performance.now();

    try {
      const transcript = await invoke("transcribe_audio_file", {
        filePath,
      });

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      this.statusText = `Transcription finished in ${elapsed}s.`;

      this.dispatchEvent(
        new CustomEvent("transcript-result", {
          detail: { transcript },
          bubbles: true,
          composed: true,
        })
      );
    } catch (e: any) {
      this.statusText = `Error transcribing file: ${e}`;
    } finally {
      this.isTranscribing = false;
    }
  }

  render() {
    return html`
      <h2>3. Audio File Transcription</h2>

      <div class="drop-zone" @click=${this.selectFile}>
        <div class="drop-title">📂 Choose an Audio File</div>
        <div class="drop-sub">
          Supports MP3, WAV, AAC, FLAC, OGG, M4A, CAF (auto-resampled via rubato)
        </div>
      </div>

      <div class="status-text">${this.statusText}</div>
    `;
  }
}
