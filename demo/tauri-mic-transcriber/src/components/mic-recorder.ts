import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

import "@material/web/button/filled-button.js";
import "@material/web/button/outlined-button.js";
import "@material/web/checkbox/checkbox.js";

@customElement("moonshine-mic-recorder")
export class MoonshineMicRecorder extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: var(--md-sys-color-surface-container, #1e1f25);
      border: 1px solid var(--md-sys-color-outline-variant, #44464f);
      border-radius: 12px;
      padding: 20px;
      box-sizing: border-box;
    }

    h2 {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--md-sys-color-primary, #b0c6ff);
      margin: 0 0 12px 0;
    }

    .waveform {
      display: flex;
      align-items: flex-end;
      gap: 3px;
      height: 36px;
      margin: 12px 0;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      padding: 4px 8px;
      box-sizing: border-box;
    }

    .bar {
      flex: 1;
      background: linear-gradient(180deg, #818cf8 0%, #4f46e5 100%);
      border-radius: 2px;
      min-height: 2px;
      transition: height 0.05s ease-out;
    }

    .options-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 0.85rem;
      color: var(--md-sys-color-on-surface-variant, #c5c6d0);
    }

    .hotkey-badge {
      display: inline-block;
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      border: 1px solid rgba(129, 140, 248, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.8rem;
    }

    .controls {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: auto;
    }

    .button-group {
      display: flex;
      gap: 8px;
    }

    .recording-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--md-sys-color-error, #f87171);
      font-weight: 600;
      font-size: 0.85rem;
    }

    .pulse {
      width: 10px;
      height: 10px;
      background-color: var(--md-sys-color-error, #f87171);
      border-radius: 50%;
      animation: pulse-anim 1.5s infinite;
    }

    @keyframes pulse-anim {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.7);
      }
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 8px rgba(248, 113, 113, 0);
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(248, 113, 113, 0);
      }
    }

    .status-text {
      font-size: 0.85rem;
      color: var(--md-sys-color-on-surface-variant, #c5c6d0);
      margin-top: 8px;
    }
  `;

  @property({ type: Boolean }) modelLoaded = false;

  @state() private isRecording = false;
  @state() private isProcessing = false;
  @state() private statusText = "Ready to record.";
  @state() private autoPaste = true;
  @state() private levels: number[] = new Array(16).fill(0.05);

  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private pcmSamples: number[] = [];
  private unlistens: UnlistenFn[] = [];

  async connectedCallback() {
    super.connectedCallback();

    const u1 = await listen<number[]>("mic-level", (e) => {
      if (Array.isArray(e.payload) && e.payload.length === 16) {
        this.levels = e.payload;
      }
    });

    const u2 = await listen<string>("global-shortcut-pressed", async () => {
      if (this.modelLoaded && !this.isRecording && !this.isProcessing) {
        this.statusText = "Push-to-Talk active (Alt+Space held)...";
        await this.startRecording();
      }
    });

    const u3 = await listen<string>("global-shortcut-released", async () => {
      if (this.isRecording) {
        this.statusText = "Push-to-Talk released. Finalizing...";
        await this.stopRecording();
      }
    });

    const u4 = await listen<string>("model-unloaded", (e) => {
      this.statusText = `Model unloaded: ${e.payload}`;
      this.modelLoaded = false;
    });

    this.unlistens.push(u1, u2, u3, u4);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unlistens.forEach((u) => u());
  }

  async startRecording() {
    if (!this.modelLoaded) {
      this.statusText = "Please load a model first.";
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      await invoke("start_stream");

      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.pcmSamples = [];
      let pendingBuffer: number[] = [];

      processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < inputData.length; i++) {
          this.pcmSamples.push(inputData[i]);
          pendingBuffer.push(inputData[i]);
        }

        if (pendingBuffer.length >= 3200) {
          const chunk = pendingBuffer;
          pendingBuffer = [];
          this.feedStreamChunk(chunk);
        }
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      this.isRecording = true;
      this.statusText = "Real-time streaming active... Speak into microphone.";
    } catch (e: any) {
      this.statusText = `Microphone / Streaming error: ${e.message || e}`;
    }
  }

  private async feedStreamChunk(chunk: number[]) {
    try {
      const transcript = await invoke("feed_stream_pcm", {
        pcmSamples: chunk,
        sampleRate: 16000,
      });

      const durationSec = (this.pcmSamples.length / 16000).toFixed(1);
      this.statusText = `Live streaming active (${durationSec}s recorded)...`;

      this.dispatchEvent(
        new CustomEvent("transcript-result", {
          detail: { transcript },
          bubbles: true,
          composed: true,
        })
      );
    } catch (e: any) {
      // Partial streaming errors non-fatal
    }
  }

  async stopRecording() {
    if (!this.isRecording) return;

    this.isRecording = false;
    this.isProcessing = true;
    this.statusText = "Finalizing stream...";

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    const sampleRate = 16000;
    const durationSec = (this.pcmSamples.length / sampleRate).toFixed(1);

    try {
      const transcript = await invoke("stop_stream");

      this.statusText = `Stream finalized (${durationSec}s recorded).${
        this.autoPaste ? " Auto-pasted to active app!" : ""
      }`;

      this.dispatchEvent(
        new CustomEvent("transcript-result", {
          detail: { transcript },
          bubbles: true,
          composed: true,
        })
      );
    } catch (e: any) {
      this.statusText = `Stream finalize error: ${e}`;
    } finally {
      this.isProcessing = false;
      this.levels = new Array(16).fill(0.05);
    }
  }

  private async toggleAutoPaste(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.autoPaste = checked;
    await invoke("toggle_auto_paste", { enable: checked });
  }

  private async toggleOverlay() {
    await invoke("toggle_overlay");
  }

  render() {
    return html`
      <h2>Microphone Dictation</h2>

      <div class="options-row">
        <span>Global Hotkey:</span>
        <span class="hotkey-badge">Option+Space</span>
        <span>(Hold for Push-to-Talk)</span>
      </div>

      <div class="waveform">
        ${this.levels.map(
          (lvl) => html`<div class="bar" style="height: ${Math.max(6, lvl * 100)}%;"></div>`
        )}
      </div>

      <div class="options-row">
        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
          <input
            type="checkbox"
            .checked=${this.autoPaste}
            @change=${this.toggleAutoPaste}
          />
          Auto-paste transcript to active app
        </label>
      </div>

      <div class="status-text">${this.statusText}</div>

      <div class="controls">
        <div class="button-group">
          ${!this.isRecording
            ? html`
                <md-filled-button
                  style="flex: 1;"
                  ?disabled=${!this.modelLoaded || this.isProcessing}
                  @click=${this.startRecording}
                >
                  🎙️ Start Recording
                </md-filled-button>
              `
            : html`
                <md-outlined-button
                  style="flex: 1;"
                  @click=${this.stopRecording}
                >
                  ⏹️ Stop Recording
                </md-outlined-button>
              `}

          <md-outlined-button @click=${this.toggleOverlay}>
            🪟 Toggle Overlay
          </md-outlined-button>
        </div>

        ${this.isRecording
          ? html`
              <div class="recording-indicator">
                <div class="pulse"></div>
                Recording active...
              </div>
            `
          : ""}
      </div>
    `;
  }
}
