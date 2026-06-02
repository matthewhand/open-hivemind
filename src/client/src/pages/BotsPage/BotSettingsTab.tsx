import { Info } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useErrorToast } from '../../components/DaisyUI/ToastNotification';
import { useSavedStamp } from '../../contexts/SavedStampContext';
import { apiService } from '../../services/api';
import { Alert } from '../../components/DaisyUI/Alert';
import Card from '../../components/DaisyUI/Card';
import Select from '../../components/DaisyUI/Select';
import Toggle from '../../components/DaisyUI/Toggle';

/**
 * App-wide default settings applied to newly created bots. These are persisted
 * via the general-settings path of the global config API
 * (`apiService.updateGlobalConfig` with a flat key patch — no `configName`),
 * the same mechanism used by the Settings → General panel. Values are namespaced
 * under `botDefaults.*` so they never collide with convict-backed config sections.
 */
interface BotDefaults {
  autoStart: boolean;
  llmProfile: string;
  persona: string;
  startupGreeting: string;
  autoReconnect: boolean;
  maxRetryAttempts: number;
  suppressDuplicates: boolean;
  dedupWindowSeconds: number;
}

const DEFAULTS: BotDefaults = {
  autoStart: false,
  llmProfile: '',
  persona: '',
  startupGreeting: '',
  autoReconnect: false,
  maxRetryAttempts: 3,
  suppressDuplicates: false,
  dedupWindowSeconds: 5,
};

const KEY_PREFIX = 'botDefaults.';

const BotSettingsTab: React.FC = () => {
  const [showAdvanced, setShowAdvanced] = useLocalStorage('ui.botSettings.showAdvanced', false);
  const { showStamp } = useSavedStamp();
  const errorToast = useErrorToast();

  const [settings, setSettings] = useState<BotDefaults>(DEFAULTS);
  const [personaOptions, setPersonaOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [llmProfileOptions, setLlmProfileOptions] = useState<
    Array<{ key: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  // Load saved defaults + the persona / LLM-profile option lists from the same
  // endpoints the rest of the Bots page uses.
  useEffect(() => {
    let active = true;
    (async () => {
      const [globalResult, personasResult, profilesResult] = await Promise.allSettled([
        apiService.getGlobalConfig(),
        apiService.getPersonas(),
        apiService.getLlmProfiles(),
      ]);

      if (!active) return;

      if (globalResult.status === 'fulfilled') {
        const saved = (globalResult.value as any)?._userSettings?.values ?? {};
        const next: BotDefaults = { ...DEFAULTS };
        (Object.keys(DEFAULTS) as Array<keyof BotDefaults>).forEach((field) => {
          const stored = saved[`${KEY_PREFIX}${field}`];
          if (stored !== undefined && stored !== null) {
            // Coerce to the field's declared type so number inputs receive numbers
            // even if the API returned the value as a string.
            (next as any)[field] =
              typeof DEFAULTS[field] === 'number' ? Number(stored) || 0 : stored;
          }
        });
        setSettings(next);
      }

      if (personasResult.status === 'fulfilled') {
        const list = (personasResult.value as any[]) ?? [];
        setPersonaOptions(
          list
            .filter((p) => p && p.id)
            .map((p) => ({ id: String(p.id), name: String(p.name ?? p.id) })),
        );
      }

      if (profilesResult.status === 'fulfilled') {
        const data = profilesResult.value as any;
        const profiles = data?.llm || data?.profiles?.llm || [];
        setLlmProfileOptions(
          (profiles as any[])
            .filter((p) => p && p.key)
            .map((p) => ({ key: String(p.key), name: String(p.name ?? p.key) })),
        );
      }

      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist a single field change. Optimistically updates local state, then saves
  // via the general-settings path. On failure the previous value is restored and
  // an error toast is shown.
  const saveField = useCallback(
    <K extends keyof BotDefaults>(field: K, value: BotDefaults[K]) => {
      setSettings((prev) => {
        const previous = prev[field];
        // Optimistically update, capturing the up-to-date previous value for rollback.
        const next = { ...prev, [field]: value };

        // Save in the background; restore the captured value if it fails.
        apiService
          .updateGlobalConfig({ [`${KEY_PREFIX}${field}`]: value })
          .then(() => showStamp())
          .catch(() => {
            setSettings((current) => ({ ...current, [field]: previous }));
            errorToast('Save failed', 'Could not save bot default. Please try again.');
          });

        return next;
      });
    },
    [showStamp, errorToast],
  );

  return (
    <div className="space-y-6">
      <Alert status="info" icon={<Info className="w-5 h-5" />}>
        <span>
          Defaults applied to newly created bots. Changes are saved automatically.
        </span>
      </Alert>

      {/* Basic Settings */}
      <Card title="Basic Settings">
        <div className="space-y-4">
          <Toggle
            label="Auto-start on creation"
            disabled={loading}
            checked={settings.autoStart}
            onChange={(e) => saveField('autoStart', e.target.checked)}
          />
          <div className="form-control w-full max-w-xs">
            <label className="label">
              <span className="label-text">Default LLM Profile</span>
            </label>
            <Select
              className="select-bordered"
              size="sm"
              disabled={loading}
              value={settings.llmProfile}
              onChange={(e) => saveField('llmProfile', e.target.value)}
            >
              <option value="">System default</option>
              {llmProfileOptions.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="form-control w-full max-w-xs">
            <label className="label">
              <span className="label-text">Default Persona</span>
            </label>
            <Select
              className="select-bordered"
              size="sm"
              disabled={loading}
              value={settings.persona}
              onChange={(e) => saveField('persona', e.target.value)}
            >
              <option value="">Default persona</option>
              {personaOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* Advanced Toggle */}
      <div className="flex items-center gap-2">
        <Toggle
          label="Advanced"
          checked={showAdvanced}
          onChange={() => setShowAdvanced((v) => !v)}
        />
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="space-y-4">
          <Card title="Startup Greeting">
            <p className="text-base-content/60 text-sm">
              Configure the default greeting message sent when a bot starts up.
            </p>
            <textarea
              className="textarea textarea-bordered w-full mt-2"
              placeholder="Hello! I'm ready to help."
              disabled={loading}
              rows={3}
              value={settings.startupGreeting}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, startupGreeting: e.target.value }))
              }
              onBlur={(e) => saveField('startupGreeting', e.target.value)}
            />
          </Card>

          <Card title="Reconnection Settings">
            <div className="space-y-3">
              <Toggle
                label="Auto-reconnect on disconnect"
                disabled={loading}
                checked={settings.autoReconnect}
                onChange={(e) => saveField('autoReconnect', e.target.checked)}
              />
              <div className="form-control w-full max-w-xs">
                <label className="label">
                  <span className="label-text">Max retry attempts</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered input-sm w-full max-w-xs"
                  placeholder="3"
                  disabled={loading}
                  value={settings.maxRetryAttempts}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, maxRetryAttempts: Number(e.target.value) || 0 }))
                  }
                  onBlur={(e) => saveField('maxRetryAttempts', Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </Card>

          <Card title="Duplicate Response Suppression">
            <div className="space-y-3">
              <Toggle
                label="Suppress duplicate responses"
                disabled={loading}
                checked={settings.suppressDuplicates}
                onChange={(e) => saveField('suppressDuplicates', e.target.checked)}
              />
              <div className="form-control w-full max-w-xs">
                <label className="label">
                  <span className="label-text">Dedup window (seconds)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered input-sm w-full max-w-xs"
                  placeholder="5"
                  disabled={loading}
                  value={settings.dedupWindowSeconds}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, dedupWindowSeconds: Number(e.target.value) || 0 }))
                  }
                  onBlur={(e) => saveField('dedupWindowSeconds', Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BotSettingsTab;
