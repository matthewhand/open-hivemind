import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Info } from 'lucide-react';
import PersonaAvatar, { type AvatarStyle } from '../PersonaAvatar';
import AvatarPicker from './AvatarPicker';
import Modal from '../DaisyUI/Modal';
import Button from '../DaisyUI/Button';
import Input from '../DaisyUI/Input';
import Validator, { ValidatorHint } from '../DaisyUI/Validator';
import { Persona } from './usePersonasLogic';
import type { Bot } from '../../services/api';
import type { PersonaResponseBehavior } from '../../types/bot';
import Checkbox from '../DaisyUI/Checkbox';
import { Alert } from '../DaisyUI/Alert';
import { apiService } from '../../services/api';
import ResponseBehaviorSection, {
  FALLBACK_DEFAULTS,
  type GlobalResponseDefaults,
} from './ResponseBehaviorSection';

interface PersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  isViewMode: boolean;
  editingPersona: Persona | null;
  cloningPersonaId: string | null;
  personaName: string;
  setPersonaName: (name: string) => void;
  personaDescription: string;
  setPersonaDescription: (desc: string) => void;
  personaPrompt: string;
  setPersonaPrompt: (prompt: string) => void;
  personaCategory: string;
  setPersonaCategory: (category: any) => void;
  selectedBotIds: string[];
  setSelectedBotIds: (ids: string[]) => void;
  bots: Bot[];
  loading: boolean;
  onSave: () => void;
  avatarStyle?: string;
  onAvatarStyleChange?: (style: string) => void;
  responseBehavior?: PersonaResponseBehavior;
  onResponseBehaviorChange?: (rb: PersonaResponseBehavior) => void;
}

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'technical_support', label: 'Technical Support' },
  { value: 'sales', label: 'Sales' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'legal', label: 'Legal' },
  { value: 'operations', label: 'Operations' },
  { value: 'educational', label: 'Educational' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'professional', label: 'Professional' },
];

export const PersonaModal: React.FC<PersonaModalProps> = ({
  isOpen,
  onClose,
  isViewMode,
  editingPersona,
  cloningPersonaId,
  personaName,
  setPersonaName,
  personaDescription,
  setPersonaDescription,
  personaPrompt,
  setPersonaPrompt,
  personaCategory,
  setPersonaCategory,
  selectedBotIds,
  setSelectedBotIds,
  bots,
  loading,
  onSave,
  avatarStyle: avatarStyleProp = 'bottts',
  onAvatarStyleChange,
  responseBehavior = {},
  onResponseBehaviorChange,
}) => {
  const isEnvLocked = useMemo(() => {
    return editingPersona?.isEnvLocked;
  }, [editingPersona]);

  // Fetch global defaults for showing "Global Default: X" labels
  const [globalDefaults, setGlobalDefaults] = useState<GlobalResponseDefaults>(FALLBACK_DEFAULTS);
  const avatarStyle = avatarStyleProp as AvatarStyle;
  const setAvatarStyle = (style: AvatarStyle) => onAvatarStyleChange?.(style);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    apiService.getGlobalConfig().then((data: any) => {
      if (cancelled) return;
      setGlobalDefaults({
        onlyWhenSpokenTo: data.MESSAGE_ONLY_WHEN_SPOKEN_TO ?? FALLBACK_DEFAULTS.onlyWhenSpokenTo,
        interactiveFollowups: data.MESSAGE_INTERACTIVE_FOLLOWUPS ?? FALLBACK_DEFAULTS.interactiveFollowups,
        unsolicitedAddressed: data.MESSAGE_UNSOLICITED_ADDRESSED ?? FALLBACK_DEFAULTS.unsolicitedAddressed,
        unsolicitedUnaddressed: data.MESSAGE_UNSOLICITED_UNADDRESSED ?? FALLBACK_DEFAULTS.unsolicitedUnaddressed,
        baseChance: data.MESSAGE_UNSOLICITED_BASE_CHANCE ?? FALLBACK_DEFAULTS.baseChance,
        mentionBonus: data.MESSAGE_MENTION_BONUS ?? FALLBACK_DEFAULTS.mentionBonus,
        leadingMentionBonus: data.MESSAGE_LEADING_MENTION_BONUS ?? FALLBACK_DEFAULTS.leadingMentionBonus,
        offTopicPenalty: data.MESSAGE_OFF_TOPIC_PENALTY ?? FALLBACK_DEFAULTS.offTopicPenalty,
        botResponsePenalty: data.MESSAGE_BOT_RESPONSE_PENALTY ?? FALLBACK_DEFAULTS.botResponsePenalty,
        burstTrafficPenalty: data.MESSAGE_BURST_TRAFFIC_PENALTY ?? FALLBACK_DEFAULTS.burstTrafficPenalty,
        graceWindowMs: data.MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS ?? FALLBACK_DEFAULTS.graceWindowMs,
      });
    }).catch(() => {
      // keep fallback defaults
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isViewMode
          ? `View Persona: ${editingPersona?.name}`
          : editingPersona
          ? 'Edit Persona'
          : cloningPersonaId
          ? 'Duplicate Persona'
          : 'Create New Persona'
      }
      size="xl"
      actions={[
        { label: isViewMode ? 'Close' : 'Cancel', onClick: onClose, variant: 'ghost', disabled: loading },
        ...(!isViewMode ? [{
          label: loading ? 'Saving...' : editingPersona ? 'Save Changes' : 'Create Persona',
          onClick: onSave,
          variant: 'primary' as const,
          disabled: loading || !!isEnvLocked,
          loading,
        }] : []),
      ]}
    >
      <div className="space-y-4">
        {isEnvLocked && !isViewMode && (
          <Alert status="warning" className="shadow-sm">
            <Shield className="w-5 h-5" />
            <span>
              This persona is locked by an environment variable. You cannot edit it here.
            </span>
          </Alert>
        )}

        {isViewMode && (
          <Alert status="info" className="shadow-sm mb-4">
            <Info className="w-5 h-5" />
            <span>Viewing persona details. Edit to make changes.</span>
          </Alert>
        )}

        {/* Avatar + Name row */}
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1 pt-6">
            <button
              type="button"
              onClick={() => !isViewMode && setShowAvatarPicker(!showAvatarPicker)}
              className={`rounded-full border-2 transition-all ${showAvatarPicker ? 'border-primary shadow-lg' : 'border-base-300 hover:border-primary/50'} ${isViewMode ? '' : 'cursor-pointer'}`}
              title={isViewMode ? undefined : 'Click to change avatar style'}
              disabled={isViewMode}
            >
              <PersonaAvatar seed={personaName || 'new-persona'} style={avatarStyle} size={56} />
            </button>
            {!isViewMode && (
              <span className="text-[10px] opacity-40">click to change</span>
            )}
          </div>
          <div className="flex-1">
            <Validator>
              <Input
                label="Persona Name"
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                placeholder="e.g., Helpful Assistant"
                required
                minLength={2}
                maxLength={100}
                disabled={!!isEnvLocked || isViewMode}
                error={!(personaName || '').trim() ? 'Name is required' : undefined}
                autoFocus={!isViewMode}
              />
              <ValidatorHint>
                {!(personaName || '').trim() ? 'A persona name is required' : 'Must be between 2 and 100 characters'}
              </ValidatorHint>
            </Validator>
          </div>
        </div>

        {/* Avatar style picker (collapsible) */}
        {showAvatarPicker && !isViewMode && (
          <div className="border border-base-200 rounded-lg p-3 bg-base-200/30">
            <p className="text-xs opacity-60 mb-2">Choose an avatar style — the avatar updates live as you type the name.</p>
            <AvatarPicker
              seed={personaName || 'new-persona'}
              selectedStyle={avatarStyle}
              onStyleChange={(style) => {
                setAvatarStyle(style);
                setShowAvatarPicker(false);
              }}
            />
          </div>
        )}

        {/* Category picker hidden — defaults to 'general'. Roadmap: user-defined categories */}

        <Input
          label="Description (Optional)"
          value={personaDescription}
          onChange={(e) => setPersonaDescription(e.target.value)}
          placeholder="Briefly describe what this persona does"
          disabled={!!isEnvLocked || isViewMode}
        />

        <div className="form-control">
          <label className="label" htmlFor="persona-system-prompt">
            <span className="label-text font-medium">
              System Prompt <span className="text-error">*</span>
            </span>
            <span className="label-text-alt text-base-content/60">Markdown supported</span>
          </label>
          <textarea
            id="persona-system-prompt"
            className={`textarea textarea-bordered h-48 font-mono text-sm leading-relaxed w-full ${!!isEnvLocked || isViewMode ? 'textarea-disabled bg-base-200' : ''}`}
            value={personaPrompt}
            onChange={(e) => setPersonaPrompt(e.target.value)}
            placeholder="You are a helpful assistant..."
            disabled={!!isEnvLocked || isViewMode}
            required
            aria-required="true"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Assign Bots</span>
            <span className="label-text-alt text-base-content/60">Optional</span>
          </label>

          <div className={`p-4 bg-base-200 rounded-box max-h-48 overflow-y-auto border border-base-300 ${isEnvLocked || isViewMode ? 'opacity-70' : ''}`}>
            {bots.length === 0 ? (
              <p className="text-sm text-base-content/60 italic p-2">
                No bots available to assign.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {bots.map((bot) => {
                  return (
                    <label
                      key={bot.id}
                      className={`cursor-pointer label justify-start gap-3 rounded-lg ${isEnvLocked || isViewMode ? 'opacity-50 cursor-not-allowed' : 'hover:bg-base-300'}`}
                      title={isEnvLocked ? 'Persona is locked by environment variable' : ''}
                    >
                      <Checkbox
                        variant="primary"
                        size="sm"
                        checked={selectedBotIds.includes(bot.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBotIds([...selectedBotIds, bot.id]);
                          } else {
                            setSelectedBotIds(selectedBotIds.filter((id) => id !== bot.id));
                          }
                        }}
                        disabled={!!isEnvLocked || isViewMode}
                      />
                      <div className="flex flex-col">
                        <span className="label-text font-medium flex items-center gap-2">
                          {bot.name}
                        </span>
                        <span className="text-xs text-base-content/50 truncate w-64 block">
                          ID: {bot.id}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

    </Modal>
  );
};
