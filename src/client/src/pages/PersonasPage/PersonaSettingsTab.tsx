import { RotateCcw, Save, Settings } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import Button from '../../components/DaisyUI/Button';
import Card from '../../components/DaisyUI/Card';
import Divider from '../../components/DaisyUI/Divider';
import Select from '../../components/DaisyUI/Select';
import Toggle from '../../components/DaisyUI/Toggle';
import type { Persona } from './hooks/usePersonasData';

/**
 * Client-side persona preferences persisted in localStorage.
 *
 * There is currently no backend persona-settings API, so these are local UI
 * preferences. The shape is intentionally simple so a future server-backed
 * implementation can adopt the same field names.
 */
export interface PersonaSettings {
  defaultPersonaId: string;
  temperature: number;
  maxTokens: number;
  ordering: 'alphabetical' | 'custom' | 'most-used';
  autoAssignment: 'none' | 'round-robin' | 'category-match';
}

export const PERSONA_SETTINGS_STORAGE_KEY = 'ui.personaSettings.values';

export const DEFAULT_PERSONA_SETTINGS: PersonaSettings = {
  defaultPersonaId: '',
  temperature: 0.7,
  maxTokens: 2048,
  ordering: 'alphabetical',
  autoAssignment: 'none',
};

const ORDERING_OPTIONS = [
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'custom', label: 'Custom Order' },
  { value: 'most-used', label: 'Most Used First' },
];

const AUTO_ASSIGNMENT_OPTIONS = [
  { value: 'none', label: 'No Auto-Assignment' },
  { value: 'round-robin', label: 'Round Robin' },
  { value: 'category-match', label: 'Category Match' },
];

interface PersonaSettingsTabProps {
  personas: Persona[];
  /** Called after settings are saved (e.g. to show a toast). */
  onSaved?: (settings: PersonaSettings) => void;
}

/**
 * Persona Settings tab. Editable controls for persona defaults and ordering,
 * persisted to localStorage. Replaces the previous placeholder.
 */
export const PersonaSettingsTab: React.FC<PersonaSettingsTabProps> = ({ personas, onSaved }) => {
  const [showAdvanced, setShowAdvanced] = useLocalStorage('ui.personaSettings.showAdvanced', false);
  const [saved, setSaved] = useLocalStorage<PersonaSettings>(
    PERSONA_SETTINGS_STORAGE_KEY,
    DEFAULT_PERSONA_SETTINGS
  );
  // Working draft so changes can be reverted before saving.
  const [draft, setDraft] = useState<PersonaSettings>(() => ({ ...DEFAULT_PERSONA_SETTINGS, ...saved }));

  const isDirty = JSON.stringify(draft) !== JSON.stringify({ ...DEFAULT_PERSONA_SETTINGS, ...saved });

  const update = useCallback(<K extends keyof PersonaSettings>(key: K, value: PersonaSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    setSaved(draft);
    onSaved?.(draft);
  }, [draft, setSaved, onSaved]);

  const handleReset = useCallback(() => {
    setDraft({ ...DEFAULT_PERSONA_SETTINGS, ...saved });
  }, [saved]);

  return (
    <div className="space-y-6">
      <Card className="shadow-md border border-base-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Persona Defaults</h3>
          </div>
        </div>

        <div className="space-y-4">
          {/* Default persona selection */}
          <div className="form-control">
            <label className="label" htmlFor="persona-default-select">
              <span className="label-text font-medium">Default Persona</span>
            </label>
            <Select
              id="persona-default-select"
              aria-label="Default Persona"
              value={draft.defaultPersonaId}
              onChange={(e) => update('defaultPersonaId', e.target.value)}
              options={[
                { value: '', label: 'Select a default persona...' },
                ...personas.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
            <label className="label">
              <span className="label-text-alt text-base-content/50">
                The persona suggested for new bots by default.
              </span>
            </label>
          </div>

          {/* Response behavior defaults */}
          <Divider>Response Behavior</Divider>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label" htmlFor="persona-temperature">
                <span className="label-text">Temperature</span>
              </label>
              <input
                id="persona-temperature"
                aria-label="Temperature"
                type="range"
                className="range range-primary range-sm"
                min={0}
                max={100}
                value={Math.round(draft.temperature * 100)}
                onChange={(e) => update('temperature', Number(e.target.value) / 100)}
              />
              <span className="text-xs text-base-content/50 mt-1">{draft.temperature.toFixed(2)}</span>
            </div>
            <div className="form-control">
              <label className="label" htmlFor="persona-max-tokens">
                <span className="label-text">Max Tokens</span>
              </label>
              <input
                id="persona-max-tokens"
                aria-label="Max Tokens"
                type="number"
                className="input input-bordered input-sm"
                min={1}
                value={draft.maxTokens}
                onChange={(e) => update('maxTokens', Math.max(1, Number(e.target.value) || 0))}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Save className="w-4 h-4" />}
            disabled={!isDirty}
            onClick={handleSave}
          >
            Save Settings
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCcw className="w-4 h-4" />}
            disabled={!isDirty}
            onClick={handleReset}
          >
            Revert
          </Button>
          {isDirty && <span className="text-xs text-warning">Unsaved changes</span>}
        </div>
        <div className="mt-4 p-3 bg-info/10 rounded-lg text-info text-xs">
          These preferences are stored locally in your browser.
        </div>
      </Card>

      {/* Advanced toggle */}
      <Card className="shadow-md border border-base-200">
        <Toggle
          label="Advanced"
          checked={showAdvanced}
          onChange={() => setShowAdvanced((v) => !v)}
          color="primary"
        />
        {showAdvanced && (
          <div className="mt-4 space-y-4 animate-fadeIn">
            <Divider>Advanced Persona Settings</Divider>
            <div className="form-control">
              <label className="label" htmlFor="persona-ordering">
                <span className="label-text">Persona Ordering</span>
              </label>
              <Select
                id="persona-ordering"
                aria-label="Persona Ordering"
                value={draft.ordering}
                onChange={(e) => update('ordering', e.target.value as PersonaSettings['ordering'])}
                options={ORDERING_OPTIONS}
              />
            </div>
            <div className="form-control">
              <label className="label" htmlFor="persona-auto-assignment">
                <span className="label-text">Auto-Assignment Rules</span>
              </label>
              <Select
                id="persona-auto-assignment"
                aria-label="Auto-Assignment Rules"
                value={draft.autoAssignment}
                onChange={(e) =>
                  update('autoAssignment', e.target.value as PersonaSettings['autoAssignment'])
                }
                options={AUTO_ASSIGNMENT_OPTIONS}
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PersonaSettingsTab;
