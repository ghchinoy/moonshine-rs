import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import "@material/web/button/outlined-button.js";

export interface TranscriptLine {
  text: string;
  start_time: number;
  duration: number;
  id: number;
  is_complete: boolean;
}

export interface Transcript {
  lines: TranscriptLine[];
}

@customElement("moonshine-transcript-view")
export class MoonshineTranscriptView extends LitElement {
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

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    h2 {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--md-sys-color-primary, #b0c6ff);
      margin: 0;
    }

    .transcript-box {
      background-color: var(--md-sys-color-surface-container-lowest, #0c0e13);
      border: 1px solid var(--md-sys-color-outline-variant, #44464f);
      border-radius: 8px;
      padding: 14px;
      flex: 1;
      min-height: 200px;
      max-height: 320px;
      overflow-y: auto;
    }

    .empty-msg {
      color: var(--md-sys-color-on-surface-variant, #c5c6d0);
      font-style: italic;
      font-size: 0.85rem;
    }

    .line {
      margin-bottom: 10px;
      line-height: 1.5;
    }

    .timestamp {
      font-family: monospace;
      font-size: 0.8rem;
      color: var(--md-sys-color-primary, #b0c6ff);
      margin-right: 8px;
    }

    .text {
      color: var(--md-sys-color-on-surface, #e2e2e9);
    }
  `;

  @property({ type: Object }) transcript: Transcript | null = null;
  @state() private copied = false;

  private copyTranscript() {
    if (!this.transcript || !this.transcript.lines) return;

    const fullText = this.transcript.lines.map((l) => l.text).join("\n");
    navigator.clipboard.writeText(fullText);

    this.copied = true;
    setTimeout(() => {
      this.copied = false;
    }, 2000);
  }

  render() {
    const lines = this.transcript?.lines || [];

    return html`
      <div class="header">
        <h2>Transcript Output</h2>
        ${lines.length > 0
          ? html`
              <md-outlined-button @click=${this.copyTranscript}>
                ${this.copied ? "✓ Copied!" : "📋 Copy"}
              </md-outlined-button>
            `
          : ""}
      </div>

      <div class="transcript-box">
        ${lines.length === 0
          ? html`<div class="empty-msg">
              No transcript yet. Record microphone or import an audio file.
            </div>`
          : lines.map(
              (line) => html`
                <div class="line">
                  <span class="timestamp">
                    [${line.start_time.toFixed(2)}s -
                    ${(line.start_time + line.duration).toFixed(2)}s]
                  </span>
                  <span class="text">${line.text}</span>
                </div>
              `
            )}
      </div>
    `;
  }
}
