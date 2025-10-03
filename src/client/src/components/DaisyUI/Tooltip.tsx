import React from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  position?: TooltipPosition;
  children: React.ReactElement;
  className?: string;
  color?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  children,
  className = '',
  color,
}) => {
  const positionClass = `tooltip-${position}`;
  const colorClass = color ? `tooltip-${color}` : '';

  return (
    <div
      className={`tooltip ${positionClass} ${colorClass} ${className}`}
      data-tip={content}
      role="tooltip"
      aria-live="polite"
    >
      {children}
    </div>
  );
};

export default Tooltip;