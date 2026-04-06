import React from 'react';
import { Lightbulb, Info } from 'lucide-react';
import { useUIStore, selectHintStyle } from '../../store/uiStore';

type HintVariant = 'tip' | 'info';

interface HintDisplayProps {
  text: string;
  variant?: HintVariant;
  className?: string;
}

/**
 * HintDisplay - Consistent hint rendering across the entire UI.
 *
 * Respects the user's hintStyle preference:
 * - 'icon': Shows only a small icon (compact)
 * - 'text': Shows icon + text inline
 * - 'full': Shows icon + text in a styled card
 */
const HintDisplay: React.FC<HintDisplayProps> = ({
  text,
  variant = 'tip',
  className = '',
}) => {
  const hintStyle = useUIStore(selectHintStyle);

  const icon = variant === 'tip'
    ? <Lightbulb className="w-4 h-4 text-warning shrink-0" />
    : <Info className="w-4 h-4 text-info shrink-0" />;

  // Compact: icon only
  if (hintStyle === 'icon') {
    return (
      <div
        className={`inline-flex items-center justify-center cursor-help ${className}`}
        title={text}
        aria-label={text}
      >
        {icon}
      </div>
    );
  }

  // Text: icon + inline text
  if (hintStyle === 'text') {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs text-base-content/60 ${className}`}>
        {icon}
        <span className="truncate">{text}</span>
      </div>
    );
  }

  // Full: styled card
  return (
    <div className={`flex items-start gap-2 text-sm text-base-content/70 bg-base-200 rounded-lg p-3 ${className}`}>
      {icon}
      <span className="flex-1">{text}</span>
    </div>
  );
};

export default HintDisplay;
