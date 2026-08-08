import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { invoke } from "@tauri-apps/api/core";

import "@material/web/button/filled-button.js";
import "@material/web/button/outlined-button.js";

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
    }

    h2 {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--md-sys-color-primary, #b0c6ff);
      margin: 0 0 12px 0;
    }

    .controls {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: auto;
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
      margin-top: 12px;
    }
  `;

  @property({ type: Boolean }) modelLoaded = false;

  @state() private isRecording = false;
  @state() private isProcessing = false;
  @state() private statusText = "Ready to record.";

  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private pcmSamples: number[] = [];
  private updateInterval: any = null;

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

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

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

      this.statusText = `Stream finalized (${durationSec}s recorded).`;

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
    }
  }

  render() {
    return html`
      <h2>Microphone Dictation</h2>

      <div class="status-text">${this.statusText}</div>

      <div class="controls">
        ${!this.isRecording
          ? html`
              <md-filled-button
                ?disabled=${!this.modelLoaded || this.isProcessing}
                @click=${this.startRecording}
              >
                🎙️ Start Recording
              </md-filled-button>
            `
          : html`
              <md-outlined-button
                @click=${this.stopRecording}
              >
                ⏹️ Stop Recording
              </md-outlined-button>
              <div class="recording-indicator">
                <div class="pulse"></div>
                Recording...
              </div>
            `}
      </div>
    `;
  }
}
