import React, { useState } from 'react';
import { Volume2, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useTTS } from '../../hooks/useTTS';
import Toggle from '../DaisyUI/Toggle';
import Button from '../DaisyUI/Button';
import { Alert } from '../DaisyUI/Alert';

/**
 * Voice settings — TTS readout configuration.
 *
 * v1 default: Web Speech API (zero install, low quality on Linux).
 * v2 opt-in:  Supertonic (browser-side ONNX, studio quality, ~400 MB models
 *             served from /tts/ — see scripts/download-tts-model.sh).
 *
 * Single voice for everything in v1. Per-bot voice is on the roadmap.
 */
const SettingsVoice: React.FC = () => {
  const tts = useTTS();
  const [testText, setTestText] = useState('Hello, this is your Open Hivemind voice readout.');

  if (!tts.isSupported) {
    return (
      <Alert status="warning" icon={<AlertCircle className="w-5 h-5" />}>
        <div className="flex-1">
          <strong>Voice readout unavailable</strong> — your browser does not expose the Web Speech API.
          Try a recent Chromium-based browser or Safari.
        </div>
      </Alert>
    );
  }

  const onEngineChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as 'webspeech' | 'supertonic';
    await tts.setEngine(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Conversation voice readout</h2>
          </div>
          <p className="text-sm text-base-content/70 mt-1">
            Speak bot conversations aloud in real time.
          </p>
        </div>
        <Toggle
          label={tts.isEnabled ? 'On' : 'Off'}
          checked={tts.isEnabled}
          onChange={(e) => tts.setEnabled(e.target.checked)}
          color="primary"
          size="md"
        />
      </div>

      {tts.isEnabled && (
        <>
          {/* Engine selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="tts-engine-select">
              Engine
            </label>
            <select
              id="tts-engine-select"
              className="select select-bordered w-full max-w-md"
              value={tts.engine}
              onChange={onEngineChange}
              disabled={tts.engineStatus === 'loading'}
            >
              <option value="webspeech">Web Speech (browser default — instant)</option>
              <option value="supertonic">Supertonic (studio quality — ~400 MB one-time load)</option>
            </select>
            <div className="text-xs text-base-content/60 flex items-center gap-2 min-h-[1.25rem]">
              {tts.engineStatus === 'loading' && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{tts.engineLoadMessage ?? 'Loading…'}</span>
                </>
              )}
              {tts.engineStatus === 'ready' && tts.activeBackend && (
                <>
                  <CheckCircle className="w-3 h-3 text-success" />
                  <span>Ready — backend: <code>{tts.activeBackend}</code></span>
                </>
              )}
              {tts.engineStatus === 'error' && tts.engineError && (
                <span className="text-error">Engine error: {tts.engineError} — fell back to Web Speech.</span>
              )}
            </div>
          </div>

          {/* Web Speech voice picker (only meaningful when engine === 'webspeech') */}
          {tts.engine === 'webspeech' && (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="tts-voice-select">
                Voice
              </label>
              <select
                id="tts-voice-select"
                className="select select-bordered w-full max-w-md"
                value={tts.selectedVoiceURI ?? ''}
                onChange={(e) => tts.setSelectedVoiceURI(e.target.value || null)}
              >
                <option value="">System default</option>
                {tts.voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang}){v.isDefault ? ' — default' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-base-content/60">
                Voice list is populated by your OS. macOS and recent Windows ship more natural-sounding voices than Linux.
              </p>
            </div>
          )}

          {/* Test surface */}
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="tts-test-text">
              Test voice
            </label>
            <textarea
              id="tts-test-text"
              className="textarea textarea-bordered w-full max-w-md"
              rows={2}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => tts.speak(testText)}
                disabled={tts.isSpeaking || (tts.engine === 'supertonic' && tts.engineStatus !== 'ready')}
              >
                {tts.isSpeaking ? 'Speaking…' : 'Speak'}
              </Button>
              <Button variant="ghost" size="sm" onClick={tts.cancel} disabled={!tts.isSpeaking}>
                Stop
              </Button>
            </div>
          </div>

          <Alert status="info" icon={<AlertCircle className="w-5 h-5" />}>
            <div className="flex-1 text-sm">
              <strong>Experimental.</strong> Single voice for all roles in v1.
              Per-bot voice selection is on the roadmap (see <code>ROADMAP.md</code>).
              Supertonic requires running <code>npm run tts:download</code> once to vendor the model files.
            </div>
          </Alert>
        </>
      )}
    </div>
  );
};

export default SettingsVoice;
