import React from 'react';
import { Persona } from '../../types/bot';
import { Badge } from '../DaisyUI';

interface PersonaChipProps {
  persona: Persona;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showUsage?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  clickable?: boolean;
  onClick?: () => void;
}

const PersonaChip: React.FC<PersonaChipProps> = ({
  persona,
  size = 'md',
  variant = 'default',
  showUsage = false,
  onEdit,
  onRemove,
  clickable = false,
  onClick
}) => {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      general: 'neutral',
      customer_service: 'primary',
      creative: 'secondary',
      technical: 'accent',
      educational: 'info',
      entertainment: 'warning',
      professional: 'success'
    };
    return colors[category] || 'neutral';
  };

  const getSizeClasses = () => {
    const sizes = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
      lg: 'px-4 py-2 text-base'
    };
    return sizes[size];
  };

  const handleChipClick = () => {
    if (clickable && onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`
        inline-flex items-center gap-2 rounded-full border
        ${getSizeClasses()}
        ${variant === 'outline' ? 'border-current bg-transparent' : ''}
        ${variant === 'ghost' ? 'border-transparent bg-base-200/50' : 'bg-base-100'}
        ${clickable ? 'cursor-pointer hover:bg-base-200 transition-colors' : ''}
        ${persona.isBuiltIn ? 'border-info/30' : ''}
      `}
      onClick={handleChipClick}
      title={`${persona.name}${persona.isBuiltIn ? ' (Built-in)' : ''}\n${persona.description}`}
    >
      {/* Category indicator */}
      <div
        className={`
          w-2 h-2 rounded-full
          bg-${getCategoryColor(persona.category)}
        `}
      />

      {/* Persona name */}
      <span className="font-medium truncate max-w-32">
        {persona.name}
      </span>

      {/* Built-in indicator */}
      {persona.isBuiltIn && (
        <Badge variant="info" size="xs" className="badge-outline ml-1">
          BUILTIN
        </Badge>
      )}

      {/* Usage count */}
      {showUsage && persona.usageCount > 0 && (
        <Badge variant="neutral" size="xs" className="badge-ghost ml-1">
          {persona.usageCount}
        </Badge>
      )}

      {/* Actions */}
      {(onEdit || onRemove) && (
        <div className="flex items-center gap-1 ml-2">
          {onEdit && !persona.isBuiltIn && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="w-4 h-4 rounded hover:bg-base-300 flex items-center justify-center"
              title="Edit persona"
            >
              ✏️
            </button>
          )}

          {onRemove && !persona.isBuiltIn && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="w-4 h-4 rounded hover:bg-error/20 flex items-center justify-center"
              title="Remove persona"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PersonaChip;