import React from 'react';

type ProgressBarProps = {
  value: number;
  max?: number;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'info' | 'error';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label?: string;
  showPercentage?: boolean;
};

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color,
  size,
  label,
  showPercentage = false,
}) => {
  const sizeClasses = {
    xs: 'progress-xs',
    sm: 'progress-sm',
    md: 'progress-md',
    lg: 'progress-lg',
  };

  const colorClass = color ? `progress-${color}` : '';
  const sizeClass = size ? sizeClasses[size] : '';

  return (
    <div className="flex items-center space-x-2">
      {label && <span className="text-sm font-medium">{label}</span>}
      <progress
        className={`progress ${colorClass} ${sizeClass}`}
        value={value}
        max={max}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      />
      {showPercentage && (
        <span className="text-sm font-medium">{`${Math.round((value / max) * 100)}%`}</span>
      )}
    </div>
  );
};

export default ProgressBar;