import React from 'react';

export interface LinearProgressProps {
  value?: number;
  variant?: 'determinate' | 'indeterminate';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

const LinearProgress: React.FC<LinearProgressProps> = ({
  value,
  variant = 'indeterminate',
  color = 'primary',
  size = 'md',
  className = '',
  style,
  ...props
}) => {
  const colorClasses = {
    primary: 'progress-primary',
    secondary: 'progress-secondary',
    success: 'progress-success',
    warning: 'progress-warning',
    error: 'progress-error',
    info: 'progress-info',
  };

  const sizeClasses = {
    sm: 'progress-sm',
    md: '',
    lg: 'progress-lg',
  };

  const classes = [
    'progress w-full',
    colorClasses[color],
    sizeClasses[size],
    className,
  ].filter(Boolean).join(' ');

  if (variant === 'determinate' && value !== undefined) {
    return (
      <progress
        className={classes}
        value={value}
        max={100}
        style={style}
        {...props}
      />
    );
  }

  // Indeterminate progress using animation
  return (
    <div className={`${classes} animate-pulse`} style={style} {...props}>
      <div className="progress-bar bg-current opacity-75 animate-bounce"></div>
    </div>
  );
};

export default LinearProgress;