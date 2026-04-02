import React, { useMemo } from 'react';
import { AlertTriangle, Copy, Shield, Info } from 'lucide-react';
import Modal from '../DaisyUI/Modal';
import Button from '../DaisyUI/Button';
import Input from '../DaisyUI/Input';
import { Persona } from './usePersonasLogic';
import type { Bot } from '../../services/api';
import Checkbox from '../DaisyUI/Checkbox';

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
}) => {
  const isEnvLocked = useMemo(() => {
    return editingPersona?.isEnvLocked;
  }, [editingPersona]);

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
    >
      <div className="space-y-4">
        {isEnvLocked && !isViewMode && (
          <div className="alert alert-warning shadow-sm">
            <Shield className="w-5 h-5" />
            <span>
              This persona is locked by an environment variable. You cannot edit it here.
            </span>
          </div>
        )}

        {isViewMode && (
          <div className="alert alert-info shadow-sm mb-4">
            <Info className="w-5 h-5" />
            <span>Viewing persona details. Edit to make changes.</span>
          </div>
        )}

        <Input
          label="Persona Name"
          value={personaName}
          onChange={(e) => setPersonaName(e.target.value)}
          placeholder="e.g., Helpful Assistant"
          required
          disabled={!!isEnvLocked || isViewMode}
          error={!personaName.trim() ? 'Name is required' : undefined}
          autoFocus={!isViewMode}
        />

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-medium">Category</span>
          </label>
          <select
            className={`select select-bordered w-full ${!!isEnvLocked || isViewMode ? 'select-disabled bg-base-200' : ''}`}
            value={personaCategory}
            onChange={(e) => setPersonaCategory(e.target.value as any)}
            disabled={!!isEnvLocked || isViewMode}
            aria-label="Persona Category"
          >
            {categoryOptions.filter((c) => c.value !== 'all').map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Description (Optional)"
          value={personaDescription}
          onChange={(e) => setPersonaDescription(e.target.value)}
          placeholder="Briefly describe what this persona does"
          disabled={!!isEnvLocked || isViewMode}
        />

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">
              System Prompt <span className="text-error">*</span>
            </span>
            <span className="label-text-alt text-base-content/60">Markdown supported</span>
          </label>
          <textarea
            className={`textarea textarea-bordered h-48 font-mono text-sm leading-relaxed ${!!isEnvLocked || isViewMode ? 'textarea-disabled bg-base-200' : ''}`}
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
                        className="checkbox checkbox-sm checkbox-primary"
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
      </div>

      <div className="modal-action mt-6">
        <Button onClick={onClose} variant="ghost" disabled={loading}>
          {isViewMode ? 'Close' : 'Cancel'}
        </Button>
        {!isViewMode && (
          <Button
            onClick={onSave}
            variant="primary"
            disabled={loading || !!isEnvLocked}
            aria-busy={loading}
          >
            {loading ? 'Saving...' : editingPersona ? 'Save Changes' : 'Create Persona'}
          </Button>
        )}
      </div>
    </Modal>
  );
};
