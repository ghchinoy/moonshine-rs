import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

@customElement("moonshine-overlay-app")
export class OverlayApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 10px 14px;
      box-sizing: border-box;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #a0a0b8;
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
    }
    .header:active {
      cursor: grabbing;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      color: #6366f1;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #10b981;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    .waveform {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 3px;
      height: 28px;
      margin: 6px 0;
    }

    .bar {
      flex: 1;
      background: linear-gradient(180deg, #818cf8 0%, #4f46e5 100%);
      border-radius: 2px;
      min-height: 2px;
      transition: height 0.05s ease-out;
    }

    .transcript {
      font-size: 0.85rem;
      line-height: 1.25;
      color: #e0e0f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 500;
    }

    .placeholder {
      color: #606078;
      font-style: italic;
    }

    .close-btn {
      cursor: pointer;
      font-size: 0.85rem;
      color: #808098;
    }
    .close-btn:hover {
      color: #f0f0f8;
    }
  `;

  @state() private levels: number[] = new Array(16).fill(0.05);
  @state() private liveText = "";
  @state() private isRecording = false;

  private unlistens: UnlistenFn[] = [];

  async connectedCallback() {
    super.connectedCallback();

    const u1 = await listen<number[]>("mic-level", (e) => {
      if (Array.isArray(e.payload) && e.payload.length === 16) {
        this.levels = e.payload;
        this.isRecording = true;
      }
    });

    const u2 = await listen<any>("stream-update", (e) => {
      if (e.payload && e.payload.lines) {
        const text = e.payload.lines.map((l: any) => l.text).join(" ");
        this.liveText = text;
      }
    });

    const u3 = await listen<any>("stream-final", (e) => {
      if (e.payload && e.payload.lines) {
        const text = e.payload.lines.map((l: any) => l.text).join(" ");
        this.liveText = text;
      }
      this.isRecording = false;
    });

    this.unlistens.push(u1, u2, u3);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unlistens.forEach((u) => u());
  }

  private async closeOverlay() {
    await invoke("toggle_overlay");
  }

  render() {
    return html`
      <div class="header" data-tauri-drag-region>
        <div class="title" data-tauri-drag-region>
          <div class="status-dot"></div>
          <span data-tauri-drag-region>MOONSHINE DICTATION</span>
        </div>
        <div class="close-btn" @click=${this.closeOverlay}>✕</div>
      </div>

      <div class="waveform">
        ${this.levels.map(
          (lvl) => html`<div class="bar" style="height: ${Math.max(8, lvl * 100)}%;"></div>`
        )}
      </div>

      <div class="transcript">
        ${this.liveText
          ? this.liveText
          : html`<span class="placeholder">Speak into microphone (Alt+Space to dictate)...</span>`}
      </div>
    `;
  }
}
