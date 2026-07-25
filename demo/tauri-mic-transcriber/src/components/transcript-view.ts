import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

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
      display: block;
      background-color: var(--panel-bg, #1e293b);
      border: 1px solid var(--border-color, #334155);
      border-radius: 8px;
      padding: 16px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    h2 {
      font-size: 1.1rem;
      color: var(--accent-color, #38bdf8);
    }

    .transcript-box {
      background-color: #0f172a;
      border: 1px solid var(--border-color, #334155);
      border-radius: 6px;
      padding: 16px;
      max-height: 360px;
      overflow-y: auto;
    }

    .empty-msg {
      color: var(--text-muted, #94a3b8);
      font-style: italic;
      font-size: 0.9rem;
    }

    .line {
      margin-bottom: 10px;
      line-height: 1.5;
    }

    .timestamp {
      font-family: monospace;
      font-size: 0.8rem;
      color: var(--accent-color, #38bdf8);
      margin-right: 8px;
    }

    .text {
      color: var(--text-main, #f8fafc);
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
        <h2>4. Transcript Output</h2>
        ${lines.length > 0
          ? html`
              <button class="secondary-btn" @click=${this.copyTranscript}>
                ${this.copied ? "✓ Copied!" : "📋 Copy Transcript"}
              </button>
            `
          : ""}
      </div>

      <div class="transcript-box">
        ${lines.length === 0
          ? html`<div class="empty-msg">
              No transcript yet. Load a model and record microphone or select an audio file.
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
