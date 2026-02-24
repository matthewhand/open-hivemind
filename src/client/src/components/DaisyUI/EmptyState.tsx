import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './index';

export type EmptyStateVariant = 'primary' | 'secondary' | 'accent' | 'error' | 'neutral' | 'noData' | 'noResults';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    variant?: EmptyStateVariant;
    className?: string;
}

const stylesMap = {
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
  error: {
    gradient: 'from-error/5 via-error/10 to-error/5',
    iconBg: 'bg-error/15 text-error group-hover:bg-error/25',
    border: 'border-error/20 hover:border-error/40',
  },
  neutral: {
    gradient: 'from-base-200 via-base-300/50 to-base-200',
    iconBg: 'bg-base-300 text-base-content/70 group-hover:bg-base-content/10',
    border: 'border-base-300 hover:border-base-content/20',
  },
};

const getVariantStyle = (variant: EmptyStateVariant) => {
  switch (variant) {
    case 'noData':
      return stylesMap.primary;
    case 'noResults':
      return stylesMap.neutral;
    case 'error':
      return stylesMap.error;
    case 'primary':
    case 'secondary':
    case 'accent':
    case 'neutral':
      return stylesMap[variant];
    default:
      return stylesMap.primary;
  }
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
}) => {
  const styles = getVariantStyle(variant);

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl py-16 px-8
        bg-gradient-to-br ${styles.gradient}
        border border-dashed ${styles.border}
        transition-all duration-300
        ${className}
      `}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-32 h-32 rounded-full blur-3xl ${variant === 'error' ? 'bg-error/10' : 'bg-primary/10'}`} />
        <div className={`absolute bottom-1/4 right-1/4 w-40 h-40 rounded-full blur-3xl ${variant === 'error' ? 'bg-error/10' : 'bg-secondary/10'}`} />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Icon container with animation */}
        <div
          className={`
            p-4 rounded-2xl mb-6
            ${styles.iconBg}
            transition-all duration-300 ease-out
            shadow-lg shadow-base-content/5
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
            variant={variant === 'error' ? 'neutral' : 'primary'}
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
