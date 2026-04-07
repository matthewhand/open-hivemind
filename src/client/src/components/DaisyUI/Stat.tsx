import React from 'react';

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  value?: React.ReactNode;
  description?: React.ReactNode;
  figure?: React.ReactNode;
  valueClassName?: string;
  figureClassName?: string;
}

export const Stat: React.FC<StatProps> = ({
  title,
  value,
  description,
  figure,
  className = '',
  valueClassName = '',
  figureClassName = '',
  children,
  ...props
}) => (
  <div className={`stat ${className}`} {...props}>
    {figure && <div className={`stat-figure ${figureClassName}`}>{figure}</div>}
    {title && <div className="stat-title">{title}</div>}
    {value !== undefined && <div className={`stat-value ${valueClassName}`}>{value}</div>}
    {description && <div className="stat-desc">{description}</div>}
    {children}
  </div>
);

export interface StatsProps extends React.HTMLAttributes<HTMLDivElement> {
  horizontal?: boolean;
}

export const Stats: React.FC<StatsProps> = ({
  horizontal = false,
  className = '',
  children,
  ...props
}) => (
  <div
    className={`stats ${horizontal ? 'stats-horizontal' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default Stat;
