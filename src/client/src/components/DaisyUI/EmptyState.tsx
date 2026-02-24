import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './index';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    variant?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
    className?: string;
    'data-testid'?: string;
}

const variantStyles = {
  primary: {
    gradient: 'from-primary/5 via-primary/10 to-primary/5',
    iconBg: 'bg-primary/15 text-primary group-hover:bg-primary/25',
    border: 'border-primary/20 hover:border-primary/40',
  },
  secondary: {
    gradient: 'from-secondary/5 via-secondary/10 to-secondary/5',
    iconBg: 'bg-secondary/15 text-secondary group-hover:bg-secondary/25',
    border: 'border-secondary/20 hover:border-secondary/40',
  },
  accent: {
    gradient: 'from-accent/5 via-accent/10 to-accent/5',
    iconBg: 'bg-accent/15 text-accent group-hover:bg-accent/25',
    border: 'border-accent/20 hover:border-accent/40',
  },
  info: {
    gradient: 'from-info/5 via-info/10 to-info/5',
    iconBg: 'bg-info/15 text-info group-hover:bg-info/25',
    border: 'border-info/20 hover:border-info/40',
  },
  success: {
    gradient: 'from-success/5 via-success/10 to-success/5',
    iconBg: 'bg-success/15 text-success group-hover:bg-success/25',
    border: 'border-success/20 hover:border-success/40',
  },
  warning: {
    gradient: 'from-warning/5 via-warning/10 to-warning/5',
    iconBg: 'bg-warning/15 text-warning group-hover:bg-warning/25',
    border: 'border-warning/20 hover:border-warning/40',
  },
  error: {
    gradient: 'from-error/5 via-error/10 to-error/5',
    iconBg: 'bg-error/15 text-error group-hover:bg-error/25',
    border: 'border-error/20 hover:border-error/40',
  },
};

/**
 * Modern empty state component with gradient backgrounds and SVG icons.
 * Replaces basic emoji empty states with a polished, professional look.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'primary',
  className = '',
  'data-testid': testId = 'empty-state',
}) => {
  const styles = variantStyles[variant];

  return (
    <div
      data-testid={testId}
      className={`
        group relative overflow-hidden rounded-2xl py-16 px-8
        bg-gradient-to-br ${styles.gradient}
        border border-dashed ${styles.border}
        transition-all duration-300
        ${className}
      `}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Icon container with animation */}
        <div
          className={`
            p-4 rounded-2xl mb-6
            ${styles.iconBg}
            transition-all duration-300 ease-out
            shadow-lg shadow-primary/5
          `}
        >
          <Icon className="w-12 h-12" strokeWidth={1.5} />
        </div>

        <h3 className="text-xl font-semibold mb-2 text-base-content">
          {title}
        </h3>

        <p className="text-base-content/60 max-w-md mb-8">
          {description}
        </p>

        {actionLabel && onAction && (
          <Button
            variant="primary"
            onClick={onAction}
            className="gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
