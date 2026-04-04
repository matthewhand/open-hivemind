import React from 'react';
import classNames from 'classnames';

/* ── Stat (individual) ─────────────────────────────────────────── */

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Content for the `stat-title` slot */
  title?: React.ReactNode;
  /** Content for the `stat-value` slot */
  value?: React.ReactNode;
  /** Content for the `stat-desc` slot */
  description?: React.ReactNode;
  /** Content for the `stat-figure` slot */
  figure?: React.ReactNode;
  /** Extra classes applied to the stat-value div */
  valueClassName?: string;
  /** Extra classes applied to the stat-figure div */
  figureClassName?: string;
}

export const Stat: React.FC<StatProps> = ({
  title,
  value,
  description,
  figure,
  className,
  valueClassName,
  figureClassName,
  children,
  ...props
}) => {
  return (
    <div className={classNames('stat', className)} {...props}>
      {figure && <div className={classNames('stat-figure', figureClassName)}>{figure}</div>}
      {title && <div className="stat-title">{title}</div>}
      {value !== undefined && <div className={classNames('stat-value', valueClassName)}>{value}</div>}
      {description && <div className="stat-desc">{description}</div>}
      {children}
    </div>
  );
};

/* ── Stats (container) ─────────────────────────────────────────── */

export interface StatsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lay stats out horizontally (adds stats-horizontal) */
  horizontal?: boolean;
}

export const Stats: React.FC<StatsProps> = ({
  horizontal = false,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={classNames('stats', { 'stats-horizontal': horizontal }, className)}
      {...props}
    >
      {children}
    </div>
  );
};

export default Stat;
