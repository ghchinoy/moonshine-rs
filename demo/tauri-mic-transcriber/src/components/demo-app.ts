import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";

import "./model-picker";
import "./mic-recorder";
import "./file-drop";
import "./transcript-view";

import "@material/web/iconbutton/outlined-icon-button.js";

import { Transcript } from "./transcript-view";

@customElement("moonshine-demo-app")
export class MoonshineDemoApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant, #44464f);
      flex-wrap: wrap;
      gap: 16px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      object-fit: contain;
    }

    .title-box h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--md-sys-color-primary, #b0c6ff);
      margin: 0 0 2px 0;
    }

    .title-box .credit {
      font-size: 0.85rem;
      color: var(--md-sys-color-on-surface-variant, #c5c6d0);
    }

    .title-box .credit a {
      color: var(--md-sys-color-primary, #b0c6ff);
      text-decoration: none;
    }

    .title-box .credit a:hover {
      text-decoration: underline;
    }

    .theme-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .theme-toggle-btn {
      font-size: 1.2rem;
      cursor: pointer;
    }

    .model-row {
      margin-bottom: 20px;
    }

    /* 3-panel single row layout */
    .three-panel-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1.3fr;
      gap: 16px;
      align-items: stretch;
    }

    @media (max-width: 900px) {
      .three-panel-row {
        grid-template-columns: 1fr;
      }
    }
  `;

  @state() private modelLoaded = false;
  @state() private currentTranscript: Transcript | null = null;
  @state() private isDarkMode = true;

  connectedCallback() {
    super.connectedCallback();
    this.applyTheme(this.isDarkMode ? "dark" : "light");
  }

  private toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme(this.isDarkMode ? "dark" : "light");
  }

  private applyTheme(themeClass: string) {
    document.body.className = themeClass;
  }

  private handleModelLoaded(e: CustomEvent) {
    this.modelLoaded = e.detail.loaded;
  }

  private handleTranscriptResult(e: CustomEvent) {
    this.currentTranscript = e.detail.transcript;
  }

  render() {
    return html`
      <div class="top-bar">
        <div class="brand">
          <img src="/logo.png" alt="Moonshine Voice Logo" class="logo" />
          <div class="title-box">
            <h1>Moonshine Voice STT</h1>
            <div class="credit">
              Powered by Moonshine Voice — Thanks to
              <a href="https://moonshine.ai" target="_blank" rel="noopener">
                Moonshine AI Team
              </a>
            </div>
          </div>
        </div>

        <div class="theme-controls">
          <md-outlined-icon-button
            class="theme-toggle-btn"
            title="Toggle Light/Dark Theme"
            @click=${this.toggleTheme}
          >
            ${this.isDarkMode ? "☀️" : "🌙"}
          </md-outlined-icon-button>
        </div>
      </div>

      <div class="model-row">
        <moonshine-model-picker
          @model-loaded=${this.handleModelLoaded}
        ></moonshine-model-picker>
      </div>

      <!-- 3-panel single row for related live, file, and transcript areas -->
      <div class="three-panel-row">
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
