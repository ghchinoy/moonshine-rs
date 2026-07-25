import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import "@material/web/button/outlined-button.js";

@customElement("moonshine-file-drop")
export class MoonshineFileDrop extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: var(--md-sys-color-surface-container, #1e1f25);
      border: 1px solid var(--md-sys-color-outline-variant, #44464f);
      border-radius: 12px;
      padding: 20px;
    }

    h2 {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--md-sys-color-primary, #b0c6ff);
      margin: 0 0 12px 0;
    }

    .drop-zone {
      border: 2px dashed var(--md-sys-color-outline, #8f9099);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background-color 0.2s;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .drop-zone:hover {
      border-color: var(--md-sys-color-primary, #b0c6ff);
      background-color: rgba(176, 198, 255, 0.05);
    }

    .drop-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface, #e2e2e9);
      margin-bottom: 4px;
    }

    .drop-sub {
      font-size: 0.8rem;
      color: var(--md-sys-color-on-surface-variant, #c5c6d0);
    }

    .status-text {
      font-size: 0.85rem;
      color: var(--md-sys-color-on-surface-variant, #c5c6d0);
      margin-top: 12px;
    }
  `;

  @property({ type: Boolean }) modelLoaded = false;

  @state() private isTranscribing = false;
  @state() private statusText = "Ready to transcribe file.";

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
    this.statusText = `Decoding and transcribing file...`;

    const startTime = performance.now();

    try {
      const transcript = await invoke("transcribe_audio_file", {
        filePath,
      });

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      this.statusText = `Finished in ${elapsed}s.`;

      this.dispatchEvent(
        new CustomEvent("transcript-result", {
          detail: { transcript },
          bubbles: true,
          composed: true,
        })
      );
    } catch (e: any) {
      this.statusText = `Error: ${e}`;
    } finally {
      this.isTranscribing = false;
    }
  }

  render() {
    return html`
      <h2>3. Audio File Import</h2>

      <div class="drop-zone" @click=${this.selectFile}>
        <div class="drop-title">📂 Browse Audio File</div>
        <div class="drop-sub">
          MP3, WAV, AAC, FLAC, OGG, M4A, CAF (auto-resampled via rubato)
        </div>
      </div>

      <div class="status-text">${this.statusText}</div>
    `;
  }
}
