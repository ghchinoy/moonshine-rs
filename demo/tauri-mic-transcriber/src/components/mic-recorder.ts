import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { invoke } from "@tauri-apps/api/core";

@customElement("moonshine-mic-recorder")
export class MoonshineMicRecorder extends LitElement {
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

    .controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .recording-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--danger-color, #f87171);
      font-weight: 600;
      font-size: 0.9rem;
    }

    .pulse {
      width: 12px;
      height: 12px;
      background-color: var(--danger-color, #f87171);
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
        box-shadow: 0 0 0 10px rgba(248, 113, 113, 0);
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(248, 113, 113, 0);
      }
    }

    .status-text {
      font-size: 0.85rem;
      color: var(--text-muted, #94a3b8);
      margin-top: 8px;
    }
  `;

  @property({ type: Boolean }) modelLoaded = false;

  @state() private isRecording = false;
  @state() private isProcessing = false;
  @state() private statusText = "Ready to record.";

  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private pcmSamples: number[] = [];

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

      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.pcmSamples = [];

      processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < inputData.length; i++) {
          this.pcmSamples.push(inputData[i]);
        }
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      this.isRecording = true;
      this.statusText = "Recording... Speak into your microphone.";
    } catch (e: any) {
      this.statusText = `Microphone access error: ${e.message || e}`;
    }
  }

  async stopRecording() {
    if (!this.isRecording) return;

    this.isRecording = false;
    this.isProcessing = true;
    this.statusText = "Processing recorded audio...";

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

    this.statusText = `Transcribing ${durationSec}s of audio...`;

    try {
      const transcript = await invoke("transcribe_pcm_samples", {
        pcmSamples: this.pcmSamples,
        sampleRate,
      });

      this.statusText = `Transcription complete (${durationSec}s recorded).`;

      this.dispatchEvent(
        new CustomEvent("transcript-result", {
          detail: { transcript },
          bubbles: true,
          composed: true,
        })
      );
    } catch (e: any) {
      this.statusText = `Transcription error: ${e}`;
    } finally {
      this.isProcessing = false;
    }
  }

  render() {
    return html`
      <h2>2. Live Microphone Dictation</h2>

      <div class="controls">
        ${!this.isRecording
          ? html`
              <button
                class="primary-btn"
                ?disabled=${!this.modelLoaded || this.isProcessing}
                @click=${this.startRecording}
              >
                🎙️ Start Recording
              </button>
            `
          : html`
              <button
                class="danger-btn"
                @click=${this.stopRecording}
              >
                ⏹️ Stop Recording
              </button>
              <div class="recording-indicator">
                <div class="pulse"></div>
                Recording active...
              </div>
            `}
      </div>

      <div class="status-text">${this.statusText}</div>
    `;
  }
}
