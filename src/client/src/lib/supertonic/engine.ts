import { loadTextToSpeech, loadVoiceStyle, writeWavFile, AVAILABLE_LANGS } from './helper';

/**
 * SupertonicEngine — thin TypeScript wrapper around the vendored Supertonic
 * TTS helpers. Lazy-loaded so the ~400 MB of WASM/ONNX never hits the bundle
 * unless the user opts in.
 *
 * Design contract (matches `useTTS` consumer expectations):
 *   - `init(baseUrl, voiceStylePath)` — load all 4 ONNX models + one voice style.
 *     Idempotent: safe to call multiple times.
 *   - `synthesize(text, lang)` — returns a Float32Array of mono PCM samples
 *     at `sampleRate` Hz. Throws if `init` hasn't completed.
 *   - `play(samples)` — plays via Web Audio API, returns a Promise that resolves
 *     when playback finishes. Cancellable via `stop()`.
 *   - `stop()` — interrupts current playback.
 *
 * See ROADMAP.md "TTS conversation readout" for the integration plan.
 */

export interface SynthesisProgress {
  phase: 'loading-model' | 'loading-voice' | 'denoising' | 'done';
  current?: number;
  total?: number;
  message?: string;
}

export type ProgressCallback = (p: SynthesisProgress) => void;

export interface SupertonicInitOptions {
  baseUrl?: string;          // default: '/tts'
  voiceStyle?: string;        // default: 'F1' — one of M1..M5, F1..F5
  preferWebGPU?: boolean;     // default: true
  onProgress?: ProgressCallback;
}

export interface SynthesizeOptions {
  lang?: string;              // default: 'en' — see AVAILABLE_LANGS
  totalStep?: number;         // diffusion steps, default 8
  speed?: number;             // default 1.05
  onProgress?: ProgressCallback;
}

export class SupertonicEngine {
  private tts: any = null;
  private style: any = null;
  private audioCtx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private initialised = false;
  private initialisingPromise: Promise<void> | null = null;
  private backend: 'webgpu' | 'wasm' | null = null;

  get isReady(): boolean {
    return this.initialised;
  }

  get activeBackend(): 'webgpu' | 'wasm' | null {
    return this.backend;
  }

  get sampleRate(): number {
    return this.tts?.sampleRate ?? 44100;
  }

  static get availableLanguages(): string[] {
    return AVAILABLE_LANGS;
  }

  /**
   * Load models + voice style. Idempotent — second call is a no-op until reset().
   * Returns the same promise if called concurrently.
   */
  async init(opts: SupertonicInitOptions = {}): Promise<void> {
    if (this.initialised) return;
    if (this.initialisingPromise) return this.initialisingPromise;

    const baseUrl = opts.baseUrl ?? '/tts';
    const voiceStyle = opts.voiceStyle ?? 'F1';
    const preferWebGPU = opts.preferWebGPU ?? true;
    const onProgress = opts.onProgress;

    this.initialisingPromise = (async () => {
      const onnxDir = `${baseUrl}/onnx`;
      const voicePath = `${baseUrl}/voice_styles/${voiceStyle}.json`;

      const tryLoad = async (provider: 'webgpu' | 'wasm') => {
        const result = await loadTextToSpeech(
          onnxDir,
          { executionProviders: [provider], graphOptimizationLevel: 'all' },
          (modelName: string, current: number, total: number) => {
            onProgress?.({ phase: 'loading-model', current, total, message: modelName });
          },
        );
        return result;
      };

      let result;
      if (preferWebGPU) {
        try {
          result = await tryLoad('webgpu');
          this.backend = 'webgpu';
        } catch {
          result = await tryLoad('wasm');
          this.backend = 'wasm';
        }
      } else {
        result = await tryLoad('wasm');
        this.backend = 'wasm';
      }
      this.tts = result.textToSpeech;

      onProgress?.({ phase: 'loading-voice', message: voiceStyle });
      this.style = await loadVoiceStyle([voicePath], false);

      this.initialised = true;
      onProgress?.({ phase: 'done' });
    })().finally(() => {
      this.initialisingPromise = null;
    });

    return this.initialisingPromise;
  }

  /**
   * Synthesise one utterance into a Float32Array of mono PCM samples
   * at `this.sampleRate` Hz. Throws if not initialised.
   */
  async synthesize(text: string, opts: SynthesizeOptions = {}): Promise<Float32Array> {
    if (!this.initialised || !this.tts || !this.style) {
      throw new Error('SupertonicEngine not initialised — call init() first');
    }
    const lang = opts.lang ?? 'en';
    const totalStep = opts.totalStep ?? 8;
    const speed = opts.speed ?? 1.05;

    const { wav, duration } = await this.tts.call(
      text,
      lang,
      this.style,
      totalStep,
      speed,
      0.3,
      (step: number, total: number) => {
        opts.onProgress?.({ phase: 'denoising', current: step, total });
      },
    );

    const wavLen = Math.floor(this.tts.sampleRate * duration[0]);
    const samples = new Float32Array(wavLen);
    for (let i = 0; i < wavLen; i++) samples[i] = wav[i];
    return samples;
  }

  /**
   * Play a Float32Array via Web Audio. Resolves when playback ends or
   * stop() is called. The AudioContext is created on first call to satisfy
   * browser autoplay policies (must be triggered from a user gesture).
   */
  async play(samples: Float32Array): Promise<void> {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate,
      });
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.stop();

    const buffer = this.audioCtx.createBuffer(1, samples.length, this.sampleRate);
    buffer.getChannelData(0).set(samples);

    return new Promise((resolve) => {
      const src = this.audioCtx!.createBufferSource();
      src.buffer = buffer;
      src.connect(this.audioCtx!.destination);
      src.onended = () => {
        this.currentSource = null;
        resolve();
      };
      src.start();
      this.currentSource = src;
    });
  }

  stop(): void {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch { /* already stopped */ }
      this.currentSource = null;
    }
  }

  /**
   * Convenience: write Float32Array samples to a WAV ArrayBuffer for download.
   */
  toWavBuffer(samples: Float32Array): ArrayBuffer {
    return writeWavFile(Array.from(samples), this.sampleRate);
  }
}

// Singleton — most consumers want the same engine instance.
let _singleton: SupertonicEngine | null = null;
export function getSupertonicEngine(): SupertonicEngine {
  if (!_singleton) _singleton = new SupertonicEngine();
  return _singleton;
}
