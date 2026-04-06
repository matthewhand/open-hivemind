import React, { useCallback } from 'react';
import { HelpCircle, Settings2 } from 'lucide-react';
import Toggle from '../DaisyUI/Toggle';
import { RangeSlider } from '../DaisyUI/RangeSlider';
import Tooltip from '../DaisyUI/Tooltip';
import { Badge } from '../DaisyUI/Badge';
import type { PersonaResponseBehavior } from '../../types/bot';

/** Global defaults from the messaging config (MESSAGE_* env vars). */
export interface GlobalResponseDefaults {
  onlyWhenSpokenTo: boolean;
  interactiveFollowups: boolean;
  unsolicitedAddressed: boolean;
  unsolicitedUnaddressed: boolean;
  baseChance: number;
  mentionBonus: number;
  leadingMentionBonus: number;
  offTopicPenalty: number;
  botResponsePenalty: number;
  burstTrafficPenalty: number;
  graceWindowMs: number;
}

export const FALLBACK_DEFAULTS: GlobalResponseDefaults = {
  onlyWhenSpokenTo: true,
  interactiveFollowups: false,
  unsolicitedAddressed: false,
  unsolicitedUnaddressed: false,
  baseChance: 0.05,
  mentionBonus: 0.5,
  leadingMentionBonus: 1.0,
  offTopicPenalty: -0.1,
  botResponsePenalty: -0.1,
  burstTrafficPenalty: -0.1,
  graceWindowMs: 300000,
};

interface Props {
  value: PersonaResponseBehavior;
  onChange: (value: PersonaResponseBehavior) => void;
  globalDefaults: GlobalResponseDefaults;
  disabled?: boolean;
}

type BooleanKey = 'onlyWhenSpokenTo' | 'interactiveFollowups' | 'unsolicitedAddressed' | 'unsolicitedUnaddressed';
type NumberKey = 'baseChance' | 'mentionBonus' | 'leadingMentionBonus' | 'offTopicPenalty' | 'botResponsePenalty' | 'burstTrafficPenalty' | 'graceWindowMs';

/* ------------------------------------------------------------------ */
/* Helper: field label with tooltip                                    */
/* ------------------------------------------------------------------ */
const FieldLabel: React.FC<{ label: string; tip: string }> = ({ label, tip }) => (
  <span className="flex items-center gap-1.5">
    {label}
    <Tooltip content={tip} position="top">
      <HelpCircle className="w-3.5 h-3.5 text-base-content/40 cursor-help" />
    </Tooltip>
  </span>
);

/* ------------------------------------------------------------------ */
/* Helper: override checkbox                                           */
/* ------------------------------------------------------------------ */
const OverrideCheckbox: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-base-content/60">
    <input
      type="checkbox"
      className="checkbox checkbox-xs checkbox-primary"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
    />
    Override
  </label>
);

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */
const ResponseBehaviorSection: React.FC<Props> = ({
  value,
  onChange,
  globalDefaults,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const isOverridden = useCallback(
    (key: keyof PersonaResponseBehavior) => value[key] !== undefined,
    [value],
  );

  const setOverride = useCallback(
    (key: keyof PersonaResponseBehavior, enabled: boolean) => {
      const next = { ...value };
      if (enabled) {
        // Initialize with the global default
        (next as any)[key] = globalDefaults[key as keyof GlobalResponseDefaults];
      } else {
        delete next[key];
      }
      onChange(next);
    },
    [value, onChange, globalDefaults],
  );

  const setBoolField = useCallback(
    (key: BooleanKey, v: boolean) => {
      onChange({ ...value, [key]: v });
    },
    [value, onChange],
  );

  const setNumField = useCallback(
    (key: NumberKey, v: number) => {
      onChange({ ...value, [key]: v });
    },
    [value, onChange],
  );

  const overrideCount = Object.keys(value).length;

  /* ---------------------------------------------------------------- */
  /* Toggle row                                                        */
  /* ---------------------------------------------------------------- */
  const renderToggle = (
    key: BooleanKey,
    label: string,
    tip: string,
  ) => {
    const active = isOverridden(key);
    const current = active ? value[key]! : globalDefaults[key];
    return (
      <div className={`flex items-center justify-between gap-2 py-2 ${!active ? 'opacity-50' : ''}`}>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <FieldLabel label={label} tip={tip} />
          <span className="text-xs text-base-content/40">
            Global Default: {globalDefaults[key] ? 'On' : 'Off'}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-none">
          <OverrideCheckbox
            checked={active}
            onChange={(on) => setOverride(key, on)}
            disabled={disabled}
          />
          <Toggle
            size="sm"
            color="primary"
            checked={current}
            onChange={(e) => setBoolField(key, e.target.checked)}
            disabled={disabled || !active}
          />
        </div>
      </div>
    );
  };

  /* ---------------------------------------------------------------- */
  /* Slider row                                                        */
  /* ---------------------------------------------------------------- */
  const renderSlider = (
    key: NumberKey,
    label: string,
    tip: string,
    min: number,
    max: number,
    step: number,
    formatter: (v: number) => string,
  ) => {
    const active = isOverridden(key);
    const current = active ? (value[key] as number) : (globalDefaults[key] as number);
    return (
      <div className={`py-2 ${!active ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <FieldLabel label={label} tip={tip} />
          <OverrideCheckbox
            checked={active}
            onChange={(on) => setOverride(key, on)}
            disabled={disabled}
          />
        </div>
        <RangeSlider
          value={current}
          min={min}
          max={max}
          step={step}
          size="sm"
          variant="primary"
          disabled={disabled || !active}
          onChange={(v) => setNumField(key, v)}
          showValue
          valueFormatter={formatter}
        />
        <span className="text-xs text-base-content/40">
          Global Default: {formatter(globalDefaults[key] as number)}
        </span>
      </div>
    );
  };

  /* ---------------------------------------------------------------- */
  /* Number input row (grace window)                                   */
  /* ---------------------------------------------------------------- */
  const renderGraceWindow = () => {
    const key: NumberKey = 'graceWindowMs';
    const active = isOverridden(key);
    const currentMs = active ? (value[key] as number) : globalDefaults[key];
    const currentSec = Math.round(currentMs / 1000);
    const globalSec = Math.round(globalDefaults[key] / 1000);
    return (
      <div className={`py-2 ${!active ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <FieldLabel label="Grace Window" tip="How long to stay engaged after being addressed" />
          <OverrideCheckbox
            checked={active}
            onChange={(on) => setOverride(key, on)}
            disabled={disabled}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="input input-bordered input-sm w-28"
            min={0}
            max={600}
            value={currentSec}
            onChange={(e) => setNumField(key, Math.max(0, Math.min(600000, Number(e.target.value) * 1000)))}
            disabled={disabled || !active}
          />
          <span className="text-sm text-base-content/60">seconds</span>
        </div>
        <span className="text-xs text-base-content/40">
          Global Default: {globalSec}s
        </span>
      </div>
    );
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <div className="border border-base-300 rounded-box overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-base-200/50 hover:bg-base-200 transition-colors text-left"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 font-medium text-sm">
          <Settings2 className="w-4 h-4 text-primary" />
          Response Behavior
          {overrideCount > 0 && (
            <Badge variant="primary" size="sm">
              {overrideCount} override{overrideCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-2 space-y-1 divide-y divide-base-200">
          {/* Toggles */}
          <div className="space-y-0">
            {renderToggle(
              'onlyWhenSpokenTo',
              'Only When Spoken To',
              'Bot only responds when directly addressed',
            )}
            {renderToggle(
              'interactiveFollowups',
              'Interactive Followups',
              'Continue responding in active conversations',
            )}
            {renderToggle(
              'unsolicitedAddressed',
              'Unsolicited (Addressed)',
              'Can respond without being spoken to in addressed channels',
            )}
            {renderToggle(
              'unsolicitedUnaddressed',
              'Unsolicited (Unaddressed)',
              'Can respond in channels where not directly addressed',
            )}
          </div>

          {/* Sliders */}
          <div className="space-y-0 pt-2">
            {renderSlider(
              'baseChance',
              'Base Response Chance',
              'Probability of unsolicited response',
              0, 0.5, 0.01,
              (v) => `${Math.round(v * 100)}%`,
            )}
            {renderSlider(
              'mentionBonus',
              'Mention Bonus',
              'Extra probability when directly mentioned',
              0, 1.0, 0.05,
              (v) => v.toFixed(2),
            )}
            {renderSlider(
              'leadingMentionBonus',
              'Leading Mention Bonus',
              'Extra bonus when mentioned at start of message',
              0, 1.0, 0.05,
              (v) => v.toFixed(2),
            )}
            {renderSlider(
              'offTopicPenalty',
              'Off-Topic Penalty',
              'Penalty for semantically irrelevant messages',
              -0.5, 0, 0.05,
              (v) => v.toFixed(2),
            )}
            {renderSlider(
              'botResponsePenalty',
              'Bot Response Penalty',
              'Penalty when other bots are talking',
              -0.5, 0, 0.05,
              (v) => v.toFixed(2),
            )}
            {renderSlider(
              'burstTrafficPenalty',
              'Burst Traffic Penalty',
              'Penalty per message in last minute',
              -0.5, 0, 0.05,
              (v) => v.toFixed(2),
            )}
          </div>

          {/* Grace Window */}
          <div className="pt-2">
            {renderGraceWindow()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseBehaviorSection;
