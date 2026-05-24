import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupertonicEngine, type SynthesisProgress } from '../lib/supertonic/engine';

/**
 * useTTS — engine-agnostic text-to-speech hook.
 *
 * v1 engine: Web Speech API (window.speechSynthesis).
 *   ✔ zero install, available in every modern browser
 *   ✔ no model download, no WASM, no GPU
 *   ✖ voice quality varies wildly by OS / browser
 *
 * v2 engine: Supertonic (browser-side ONNX TTS via onnxruntime-web).
 *   ✔ studio-grade 44.1 kHz output, consistent across browsers
 *   ✖ ~400 MB of model files (vendored, served same-origin from /tts/)
 *   See `src/client/src/lib/supertonic/engine.ts`.
 *
 * Engine selection:
 *   - default: 'webspeech'
 *   - user opts into 'supertonic' via Settings; the engine lazy-loads.
 *   - if Supertonic fails to load, the hook reports the error and falls
 *     back to Web Speech automatically.
 *
 * v1 scope (per ROADMAP "TTS conversation readout"):
 *   - Single voice for everything (no user-vs-assistant differentiation).
 *   - Global enable/disable in System Settings.
 *   - No per-bot config — see TODOs in ROADMAP for follow-ups.
 */

const LS_ENABLED_KEY = 'hivemind.tts.enabled';
const LS_VOICE_KEY = 'hivemind.tts.voiceURI';
const LS_ENGINE_KEY = 'hivemind.tts.engine';

const isBrowser = typeof window !== 'undefined';
const isWebSpeechSupported = isBrowser && typeof window.speechSynthesis !== 'undefined';

export type TTSEngine = 'webspeech' | 'supertonic';
export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface TTSVoice {
  voiceURI: string;
  name: string;
  lang: string;
  isDefault: boolean;
}

export interface UseTTSReturn {
  isSupported: boolean;
  isEnabled: boolean;
  setEnabled: (v: boolean) => void;
  isSpeaking: boolean;
  voices: TTSVoice[];
  selectedVoiceURI: string | null;
  setSelectedVoiceURI: (uri: string | null) => void;
  speak: (text: string) => void;
  cancel: () => void;
  // Engine selection
  engine: TTSEngine;
  setEngine: (e: TTSEngine) => Promise<void>;
  engineStatus: EngineStatus;
  engineError: string | null;
  engineLoadMessage: string | null;
  activeBackend: string | null;
}

export function useTTS(): UseTTSReturn {
  const [isEnabled, setEnabledState] = useState<boolean>(() => {
    if (!isBrowser) return false;
    return localStorage.getItem(LS_ENABLED_KEY) === 'true';
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURIState] = useState<string | null>(() => {
    if (!isBrowser) return null;
    return localStorage.getItem(LS_VOICE_KEY);
  });
  const [engine, setEngineState] = useState<TTSEngine>(() => {
    if (!isBrowser) return 'webspeech';
    const v = localStorage.getItem(LS_ENGINE_KEY);
    return v === 'supertonic' ? 'supertonic' : 'webspeech';
  });
  const [engineStatus, setEngineStatus] = useState<EngineStatus>(
    engine === 'webspeech' ? 'ready' : 'idle',
  );
  const [engineError, setEngineError] = useState<string | null>(null);
  const [engineLoadMessage, setEngineLoadMessage] = useState<string | null>(null);
  const [activeBackend, setActiveBackend] = useState<string | null>(
    engine === 'webspeech' ? 'web-speech' : null,
  );

  // Web Speech voices load asynchronously on some browsers.
  useEffect(() => {
    if (!isWebSpeechSupported) return;
    const load = () => {
      const list = window.speechSynthesis.getVoices().map((v) => ({
        voiceURI: v.voiceURI,
        name: v.name,
        lang: v.lang,
        isDefault: v.default,
      }));
      setVoices(list);
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    if (isBrowser) localStorage.setItem(LS_ENABLED_KEY, String(v));
    if (!v && isWebSpeechSupported) window.speechSynthesis.cancel();
  }, []);

  const setSelectedVoiceURI = useCallback((uri: string | null) => {
    setSelectedVoiceURIState(uri);
    if (!isBrowser) return;
    if (uri) localStorage.setItem(LS_VOICE_KEY, uri);
    else localStorage.removeItem(LS_VOICE_KEY);
  }, []);

  const handleProgress = (p: SynthesisProgress) => {
    if (p.phase === 'loading-model') {
      setEngineLoadMessage(`Loading model ${p.current}/${p.total}: ${p.message}`);
    } else if (p.phase === 'loading-voice') {
      setEngineLoadMessage(`Loading voice: ${p.message}`);
    } else if (p.phase === 'denoising') {
      setEngineLoadMessage(`Synthesising (${p.current}/${p.total})`);
    } else if (p.phase === 'done') {
      setEngineLoadMessage(null);
    }
  };

  const setEngine = useCallback(async (next: TTSEngine) => {
    if (next === engine && engineStatus === 'ready') return;
    setEngineError(null);
    setEngineLoadMessage(null);

    if (next === 'webspeech') {
      setEngineState('webspeech');
      setEngineStatus(isWebSpeechSupported ? 'ready' : 'error');
      setActiveBackend(isWebSpeechSupported ? 'web-speech' : null);
      if (!isWebSpeechSupported) setEngineError('Web Speech API not available in this browser');
      if (isBrowser) localStorage.setItem(LS_ENGINE_KEY, 'webspeech');
      return;
    }

    // supertonic
    setEngineState('supertonic');
    setEngineStatus('loading');
    setActiveBackend(null);
    if (isBrowser) localStorage.setItem(LS_ENGINE_KEY, 'supertonic');
    try {
      const eng = getSupertonicEngine();
      const baseUrl =
        // @ts-expect-error import.meta is Vite-only
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TTS_MODEL_BASE_URL) || '/tts';
      await eng.init({ baseUrl, onProgress: handleProgress });
      setEngineStatus('ready');
      setActiveBackend(eng.activeBackend);
    } catch (err: any) {
      setEngineError(err?.message ?? String(err));
      setEngineStatus('error');
      // Fall back to web speech silently
      setEngineState('webspeech');
      setActiveBackend(isWebSpeechSupported ? 'web-speech' : null);
      if (isBrowser) localStorage.setItem(LS_ENGINE_KEY, 'webspeech');
    }
  }, [engine, engineStatus]);

  const cancelSpeech = useCallback(() => {
    if (isWebSpeechSupported) window.speechSynthesis.cancel();
    try { getSupertonicEngine().stop(); } catch { /* engine may not exist */ }
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback((text: string) => {
    if (!isEnabled || !text.trim()) return;

    if (engine === 'supertonic' && engineStatus === 'ready') {
      const eng = getSupertonicEngine();
      setIsSpeaking(true);
      eng.synthesize(text, { onProgress: handleProgress })
        .then((samples) => eng.play(samples))
        .catch((err) => {
          setEngineError(err?.message ?? String(err));
        })
        .finally(() => setIsSpeaking(false));
      return;
    }

    // Web Speech path
    if (!isWebSpeechSupported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoiceURI) {
      const match = window.speechSynthesis.getVoices().find((v) => v.voiceURI === selectedVoiceURI);
      if (match) utterance.voice = match;
    }
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [isEnabled, engine, engineStatus, selectedVoiceURI]);

  // Cancel any pending utterance if the consumer unmounts.
  const speakingRef = useRef(isSpeaking);
  speakingRef.current = isSpeaking;
  useEffect(() => () => {
    if (isWebSpeechSupported && speakingRef.current) window.speechSynthesis.cancel();
    try { getSupertonicEngine().stop(); } catch { /* noop */ }
  }, []);

  return {
    isSupported: isWebSpeechSupported,
    isEnabled,
    setEnabled,
    isSpeaking,
    voices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    speak: speakText,
    cancel: cancelSpeech,
    engine,
    setEngine,
    engineStatus,
    engineError,
    engineLoadMessage,
    activeBackend,
  };
}
