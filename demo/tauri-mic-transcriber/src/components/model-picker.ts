import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

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

    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 12px;
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
    }

    .progress-bar {
      margin-top: 12px;
      width: 100%;
      height: 8px;
      background-color: var(--border-color, #334155);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background-color: var(--accent-color, #38bdf8);
      width: 0%;
      transition: width 0.2s;
    }

    .progress-text {
      font-size: 0.85rem;
      color: var(--text-muted, #94a3b8);
      margin-top: 6px;
    }

    .model-path {
      font-family: monospace;
      font-size: 0.85rem;
      color: var(--text-muted, #94a3b8);
      word-break: break-all;
      margin-top: 8px;
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
      // Query dependency manifest for English Tiny model
      const manifestJson = await invoke<string>("get_stt_dependencies", {
        language: "en",
        modelArch: 0, // Tiny
      });

      this.statusMessage = "Downloading model files from CDN...";

      // Destination directory in app data
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
      <h2>1. Model Selection</h2>
      <div class="status-badge ${this.isLoaded ? "loaded" : "not-loaded"}">
        ${this.isLoaded ? "Model Loaded" : "No Model Loaded"}
      </div>

      <div class="actions">
        <button
          class="primary-btn"
          ?disabled=${this.isDownloading}
          @click=${this.selectDirectory}
        >
          📁 Browse Local Directory
        </button>

        <button
          class="secondary-btn"
          ?disabled=${this.isDownloading}
          @click=${this.downloadTinyModel}
        >
          ⬇️ Auto-Download tiny-en Model
        </button>
      </div>

      ${this.isDownloading && this.downloadProgress
        ? html`
            <div class="progress-bar">
              <div
                class="progress-fill"
                style="width: ${this.downloadProgress.percent}%"
              ></div>
            </div>
            <div class="progress-text">
              Downloading ${this.downloadProgress.file_name}:
              ${(this.downloadProgress.downloaded_bytes / 1024 / 1024).toFixed(1)}MB /
              ${(this.downloadProgress.total_bytes / 1024 / 1024).toFixed(1)}MB
              (${this.downloadProgress.percent.toFixed(1)}%)
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
