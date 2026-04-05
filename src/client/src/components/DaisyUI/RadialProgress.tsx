import React from 'react';
import classNames from 'classnames';

export interface RadialProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Progress value from 0 to 100 */
  value: number;
  /** Size of the radial progress (CSS size string, e.g., '4rem') */
  size?: string;
  /** Thickness of the progress ring (CSS size string, e.g., '0.25rem') */
  thickness?: string;
  /** Color variant */
  color?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error';
  /** Label content displayed in the center */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const RadialProgress: React.FC<RadialProgressProps> = React.memo(({
  value,
  size,
  thickness,
  color,
  children,
  className,
  style,
  ...props
}) => {
  const classes = classNames(
    'radial-progress',
    {
      [`text-${color}`]: color,
    },
    className,
  );

  const progressStyle: React.CSSProperties = {
    ...style,
    '--value': value,
    ...(size ? { '--size': size } : {}),
    ...(thickness ? { '--thickness': thickness } : {}),
  } as React.CSSProperties;

  return (
    <div
      className={classes}
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
});

RadialProgress.displayName = 'RadialProgress';

export default RadialProgress;
