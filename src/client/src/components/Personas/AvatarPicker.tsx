import React, { useState } from 'react';
import PersonaAvatar, { AVATAR_STYLES, type AvatarStyle } from '../PersonaAvatar';
import Tabs from '../DaisyUI/Tabs';

interface AvatarPickerProps {
  seed: string;
  selectedStyle: AvatarStyle;
  onStyleChange: (style: AvatarStyle) => void;
  className?: string;
}

/**
 * Avatar style picker — shows a preview grid of all available DiceBear styles
 * for the given seed, with the selected one highlighted.
 */
const AvatarPicker: React.FC<AvatarPickerProps> = ({
  seed,
  selectedStyle,
  onStyleChange,
  className = '',
}) => {
  const effectiveSeed = seed || 'default-persona';

  return (
    <div className={className}>
      <div className="grid grid-cols-5 gap-3">
        {AVATAR_STYLES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onStyleChange(key)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all cursor-pointer hover:bg-base-200 ${
              selectedStyle === key
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-transparent'
            }`}
            title={label}
            aria-label={`Select ${label} avatar style`}
            aria-pressed={selectedStyle === key}
          >
            <PersonaAvatar seed={effectiveSeed} style={key} size={36} />
            <span className="text-[10px] opacity-60 truncate w-full text-center">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default React.memo(AvatarPicker);
