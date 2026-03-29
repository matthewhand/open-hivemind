import React from 'react';
import {
  AlertTriangle,
  Copy,
  Edit2,
  Eye,
  GripVertical,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import Badge from '../DaisyUI/Badge';
import Button from '../DaisyUI/Button';
import Card from '../DaisyUI/Card';
import { Persona } from './usePersonasLogic';

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
      key={persona.id}
      className={`border transition-all hover:shadow-md h-full flex flex-col ${
        persona.isEnvLocked
          ? 'border-warning/30 bg-warning/5'
          : 'border-base-200 bg-base-100 hover:border-primary/50'
      } ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}
    >
      <div className="card-body p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div
              {...dragHandleProps}
              className="cursor-grab hover:bg-base-200 p-1 rounded -ml-2 text-base-content/40 hover:text-base-content"
              title="Drag to reorder"
            >
              <GripVertical className="w-5 h-5" />
            </div>
            <input
              type="checkbox"
              className="checkbox checkbox-sm checkbox-primary rounded"
              checked={isSelected}
              onChange={() => onToggleSelection(persona.id)}
              aria-label={`Select ${persona.name}`}
            />
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
              <User className="w-5 h-5" />
            </div>
            <div>
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
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="ghost" size="sm">
                  {categoryOptions.find((c) => c.value === persona.category)?.label || 'General'}
                </Badge>
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
                  disabled={persona.isEnvLocked}
                  className={persona.isEnvLocked ? 'opacity-50 cursor-not-allowed' : ''}
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
                <button
                  onClick={() => onCopyPrompt(persona.prompt)}
                >
                  <Copy className="w-4 h-4" /> Copy Prompt
                </button>
              </li>
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
            </ul>
          </div>
        </div>

        {persona.description && (
          <p className="text-sm text-base-content/70 line-clamp-2 mt-2 flex-grow">
            {persona.description}
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-base-200">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-base-content/50">
              Assigned Bots ({persona.assignedBotNames.length})
            </span>
            <div className="flex flex-wrap gap-1">
              {persona.assignedBotNames.length > 0 ? (
                persona.assignedBotNames.map((name, idx) => (
                  <Badge key={idx} variant="outline" size="sm" className="bg-base-200/50">
                    {name}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-base-content/40 italic">None</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
