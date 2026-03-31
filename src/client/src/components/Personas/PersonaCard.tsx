import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Edit2,
  Eye,
  GripVertical,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import Badge from '../DaisyUI/Badge';
import Card from '../DaisyUI/Card';
import { Persona } from './usePersonasLogic';
import Checkbox from '../DaisyUI/Checkbox';

interface PersonaCardProps {
  persona: Persona;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onEdit: (persona: Persona) => void;
  onView: (persona: Persona) => void;
  onClone: (persona: Persona) => void;
  onDelete: (persona: Persona) => void;
  onCopyPrompt: (prompt: string) => void;
  dragHandleProps?: any;
}

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'creative', label: 'Creative' },
  { value: 'technical', label: 'Technical' },
  { value: 'educational', label: 'Educational' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'professional', label: 'Professional' },
];

export const PersonaCard: React.FC<PersonaCardProps> = ({
  persona,
  isSelected,
  onToggleSelection,
  onEdit,
  onView,
  onClone,
  onDelete,
  onCopyPrompt,
  dragHandleProps,
}) => {
  return (
    <Card
      className={`border transition-all hover:shadow-md h-full flex flex-col ${
        persona.isEnvLocked
          ? 'border-warning/30 bg-warning/5'
          : 'border-base-200 bg-base-100 hover:border-primary/50'
      } ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}
    >
      <div className="card-body p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {dragHandleProps?.isMobile ? (
              <span className="flex flex-col">
                <button
                  className="btn btn-ghost btn-xs btn-square p-0"
                  onClick={dragHandleProps.onMoveUp}
                  disabled={dragHandleProps.disabledUp}
                  aria-label="Move up"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  className="btn btn-ghost btn-xs btn-square p-0"
                  onClick={dragHandleProps.onMoveDown}
                  disabled={dragHandleProps.disabledDown}
                  aria-label="Move down"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </span>
            ) : (
              <span
                className="cursor-grab active:cursor-grabbing text-base-content/40 hover:text-base-content/70"
                title="Drag to reorder"
              >
                <GripVertical className="w-4 h-4" />
              </span>
            )}
            {!persona.isBuiltIn && (
              <Checkbox
                className="checkbox checkbox-sm checkbox-primary"
                checked={isSelected}
                onChange={() => onToggleSelection(persona.id)}
                aria-label={`Select ${persona.name}`}
              />
            )}
            <div className={`p-2 rounded-full flex items-center justify-center w-10 h-10 ${persona.isBuiltIn ? 'bg-primary/10 text-primary' : 'bg-base-200'}`}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  {persona.name}
                  {persona.isEnvLocked && (
                    <div
                      className="tooltip tooltip-right normal-case"
                      data-tip="Configured via environment variable. Cannot be deleted or edited here."
                    >
                      <Shield className="w-4 h-4 text-warning" />
                    </div>
                  )}
                </h3>
                {persona.isBuiltIn && (
                  <Badge size="small" variant="neutral" style="outline">
                    Built-in
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-base-content/60">
                  {categoryOptions.find((c) => c.value === persona.category)?.label || 'General'}
                </span>
              </div>
            </div>
          </div>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-square">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="w-5 h-5 stroke-current"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                ></path>
              </svg>
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
            >
              <li>
                <button onClick={() => onView(persona)}>
                  <Eye className="w-4 h-4" /> View Details
                </button>
              </li>
              <li>
                <button
                  onClick={() => onEdit(persona)}
                  disabled={persona.isEnvLocked || persona.isBuiltIn}
                  className={persona.isEnvLocked || persona.isBuiltIn ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
              </li>
              <li>
                <button onClick={() => onClone(persona)}>
                  <Copy className="w-4 h-4" /> Duplicate
                </button>
              </li>
              <li>
                <button onClick={() => onCopyPrompt(persona.systemPrompt)}>
                  <Copy className="w-4 h-4" /> Copy Prompt
                </button>
              </li>
              {!persona.isBuiltIn && (
                <>
                  <div className="divider my-1"></div>
                  <li>
                    <button
                      onClick={() => onDelete(persona)}
                      disabled={persona.isEnvLocked}
                      className={`text-error hover:bg-error hover:text-error-content ${
                        persona.isEnvLocked ? 'opacity-50 cursor-not-allowed text-base-content hover:bg-transparent hover:text-base-content' : ''
                      }`}
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="mb-4 flex-1">
          {persona.description && (
            <p className="text-sm text-base-content/70 mb-3 line-clamp-2">
              {persona.description}
            </p>
          )}

          <div className="bg-base-200/50 p-3 rounded-lg mb-3">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold text-base-content/40 uppercase">
                System Prompt
              </h4>
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-primary"
                  onClick={() => onCopyPrompt(persona.systemPrompt)}
                  title="Copy System Prompt"
                  aria-label="Copy System Prompt"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
            <p className="text-sm text-base-content/80 line-clamp-3 italic font-mono text-xs">
              "{persona.systemPrompt}"
            </p>
          </div>

          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-base-content/50 uppercase">
              Assigned Bots ({persona.assignedBotNames.length})
            </h4>
          </div>

          {persona.assignedBotNames.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {persona.assignedBotNames.slice(0, 3).map((botName) => (
                <Badge key={botName} variant="secondary" size="small" style="outline">
                  {botName}
                </Badge>
              ))}
              {persona.assignedBotNames.length > 3 && (
                <Badge variant="ghost" size="small">
                  +{persona.assignedBotNames.length - 3} more
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-sm text-base-content/40 italic">None</span>
          )}
        </div>
      </div>
    </Card>
  );
};
