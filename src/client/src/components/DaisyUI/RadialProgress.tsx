import React from 'react';

export interface RadialProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  size?: string;
  thickness?: string;
  color?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error';
  children?: React.ReactNode;
  className?: string;
}

const RadialProgress: React.FC<RadialProgressProps> = ({
  value,
  size,
  thickness,
  color,
  children,
  className = '',
  style,
  ...props
}) => {
  const colorClass = color ? `text-${color}` : '';

  const progressStyle: React.CSSProperties = {
    ...style,
    '--value': value,
    ...(size ? { '--size': size } : {}),
    ...(thickness ? { '--thickness': thickness } : {}),
  } as React.CSSProperties;

  return (
    <div
      className={`radial-progress ${colorClass} ${className}`}
      style={progressStyle}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      {children}
    </div>
  );
};

RadialProgress.displayName = 'RadialProgress';

export default RadialProgress;
