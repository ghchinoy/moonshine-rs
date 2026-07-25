import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";

import "./model-picker";
import "./mic-recorder";
import "./file-drop";
import "./transcript-view";

import { Transcript } from "./transcript-view";

@customElement("moonshine-demo-app")
export class MoonshineDemoApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
    }

    header {
      margin-bottom: 24px;
      text-align: center;
    }

    h1 {
      font-size: 1.8rem;
      color: var(--accent-color, #38bdf8);
      margin-bottom: 8px;
    }

    .subtitle {
      color: var(--text-muted, #94a3b8);
      font-size: 0.95rem;
    }

    .grid {
      display: grid;
      gap: 20px;
    }
  `;

  @state() private modelLoaded = false;
  @state() private currentTranscript: Transcript | null = null;

  private handleModelLoaded(e: CustomEvent) {
    this.modelLoaded = e.detail.loaded;
  }

  private handleTranscriptResult(e: CustomEvent) {
    this.currentTranscript = e.detail.transcript;
  }

  render() {
    return html`
      <header>
        <h1>Moonshine Voice STT Demo</h1>
        <div class="subtitle">
          On-device speech-to-text in Rust + Tauri v2 + Lit Web Components
        </div>
      </header>

      <div class="grid">
        <moonshine-model-picker
          @model-loaded=${this.handleModelLoaded}
        ></moonshine-model-picker>

        <moonshine-mic-recorder
          .modelLoaded=${this.modelLoaded}
          @transcript-result=${this.handleTranscriptResult}
        ></moonshine-mic-recorder>

        <moonshine-file-drop
          .modelLoaded=${this.modelLoaded}
          @transcript-result=${this.handleTranscriptResult}
        ></moonshine-file-drop>

        <moonshine-transcript-view
          .transcript=${this.currentTranscript}
        ></moonshine-transcript-view>
      </div>
    `;
  }
}
