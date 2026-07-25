import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

import "@material/web/button/filled-button.js";
import "@material/web/button/outlined-button.js";
import "@material/web/progress/linear-progress.js";

export interface DownloadProgress {
  file_name: string;
  downloaded_bytes: number;
  total_bytes: number;
  percent: number;
}

@customElement("moonshine-model-picker")
export class MoonshineModelPicker extends LitElement {
  static styles = css`
    :host {
      display: block;
      background-color: var(--md-sys-color-surface-container, #1e1f25);
      border: 1px solid var(--md-sys-color-outline-variant, #44464f);
      border-radius: 12px;
      padding: 20px;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    h2 {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--md-sys-color-primary, #b0c6ff);
      margin: 0;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .loaded {
      background-color: rgba(74, 222, 128, 0.2);
      color: #4ade80;
    }

    .not-loaded {
      background-color: rgba(248, 113, 113, 0.2);
      color: #f87171;
    }

    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 8px;
    }

    .progress-box {
      margin-top: 14px;
    }

    .progress-text {
      font-size: 0.85rem;
      color: var(--md-sys-color-on-surface-variant, #c5c6d0);
      margin-top: 6px;
    }

    .model-path {
      font-family: monospace;
      font-size: 0.85rem;
      color: var(--md-sys-color-on-surface-variant, #c5c6d0);
      word-break: break-all;
      margin-top: 10px;
    }
  `;

  @state() private isLoaded = false;
  @state() private modelPath = "";
  @state() private isDownloading = false;
  @state() private downloadProgress: DownloadProgress | null = null;
  @state() private statusMessage = "No model loaded. Please select or download a model.";

  async connectedCallback() {
    super.connectedCallback();
    await listen<DownloadProgress>("download-progress", (event) => {
      this.downloadProgress = event.payload;
    });
  }

  async selectDirectory() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Moonshine Model Directory (e.g. tiny-en)",
      });

      if (selected && typeof selected === "string") {
        await this.loadModelPath(selected);
      }
    } catch (e: any) {
      this.statusMessage = `Error selecting directory: ${e}`;
    }
  }

  async downloadTinyModel() {
    this.isDownloading = true;
    this.statusMessage = "Fetching model dependencies manifest...";

    try {
      const manifestJson = await invoke<string>("get_stt_dependencies", {
        language: "en",
        modelArch: 0, // Tiny
      });

      this.statusMessage = "Downloading model files from CDN...";
      const destDir = "models/tiny-en/quantized/tiny-en";

      const finalPath = await invoke<string>("download_model_files", {
        manifestJson,
        destDir,
      });

      this.statusMessage = "Download complete. Loading model into memory...";
      await this.loadModelPath(finalPath);
    } catch (e: any) {
      this.statusMessage = `Download failed: ${e}`;
      this.isLoaded = false;
    } finally {
      this.isDownloading = false;
    }
  }

  private async loadModelPath(path: string) {
    try {
      const result = await invoke<string>("load_transcriber", {
        modelDir: path,
        archU32: 0, // Tiny
      });

      this.modelPath = path;
      this.isLoaded = true;
      this.statusMessage = result;

      this.dispatchEvent(
        new CustomEvent("model-loaded", {
          detail: { modelPath: path, loaded: true },
          bubbles: true,
          composed: true,
        })
      );
    } catch (e: any) {
      this.isLoaded = false;
      this.statusMessage = `Failed to load model: ${e}`;
    }
  }

  render() {
    return html`
      <div class="header">
        <h2>1. Model Selection</h2>
        <div class="status-badge ${this.isLoaded ? "loaded" : "not-loaded"}">
          ${this.isLoaded ? "Model Loaded" : "No Model Loaded"}
        </div>
      </div>

      <div class="actions">
        <md-filled-button
          ?disabled=${this.isDownloading}
          @click=${this.selectDirectory}
        >
          📁 Browse Local Directory
        </md-filled-button>

        <md-outlined-button
          ?disabled=${this.isDownloading}
          @click=${this.downloadTinyModel}
        >
          ⬇️ Auto-Download tiny-en Model
        </md-outlined-button>
      </div>

      ${this.isDownloading && this.downloadProgress
        ? html`
            <div class="progress-box">
              <md-linear-progress
                progress="${this.downloadProgress.percent / 100}"
              ></md-linear-progress>
              <div class="progress-text">
                Downloading ${this.downloadProgress.file_name}:
                ${(this.downloadProgress.downloaded_bytes / 1024 / 1024).toFixed(1)}MB /
                ${(this.downloadProgress.total_bytes / 1024 / 1024).toFixed(1)}MB
                (${this.downloadProgress.percent.toFixed(1)}%)
              </div>
            </div>
          `
        : ""}

      <div class="progress-text">${this.statusMessage}</div>
      ${this.modelPath
        ? html`<div class="model-path">Active Path: ${this.modelPath}</div>`
        : ""}
    `;
  }
}
