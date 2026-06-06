import React from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  position?: TooltipPosition;
  children: React.ReactElement;
  className?: string;
  color?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
}

/**
 * Returns true when `content` is a meaningful tip that DaisyUI can surface via
 * `data-tip`. Empty strings, whitespace-only strings, `null` and `undefined`
 * are treated as "no tip" so we avoid rendering an empty tooltip bubble.
 */
export const hasMeaningfulTip = (content: React.ReactNode): boolean => {
  if (content === null || content === undefined || content === false) {
    return false;
  }
  if (typeof content === 'string') {
    return content.trim().length > 0;
  }
  return true;
};

const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  children,
  className = '',
  color,
}) => {
  // When there is no meaningful tip, render the children unchanged so no empty
  // tooltip bubble appears on hover/focus (common for dynamically-built labels).
  if (!hasMeaningfulTip(content)) {
    return <>{children}</>;
  }

  const positionClass = `tooltip-${position}`;
  const colorClass = color ? `tooltip-${color}` : '';
  const classes = ['tooltip', positionClass, colorClass, className]
    .filter(Boolean)
    .join(' ');

  const safeTip = typeof content === 'string' || typeof content === 'number' ? String(content) : undefined;

  return (
    <div
      className={classes}
      data-tip={safeTip}
      role="tooltip"
      aria-live="polite"
    >
      {children}
    </div>
  );
};

export default Tooltip;