import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Search, AlertCircle, FileQuestion, Settings, RefreshCw } from 'lucide-react';
import Button from './DaisyUI/Button';

export interface EmptyStateAction {
  label: string | React.ReactNode;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'link';
  buttonStyle?: 'solid' | 'outline';
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  variant?: 'primary' | 'secondary' | 'accent' | 'error' | 'warning' | 'info' | 'success' | 'noData' | 'noResults';
  className?: string;
}

const variantStyles: Record<string, { gradient: string; iconBg: string; border: string; buttonShadow: string; blob: string }> = {
  primary: {
    gradient: 'from-primary/5 via-primary/10 to-primary/5',
    iconBg: 'bg-primary/15 text-primary group-hover:bg-primary/25',
    border: 'border-primary/20 hover:border-primary/40',
    buttonShadow: 'shadow-primary/25 hover:shadow-primary/40',
    blob: 'bg-primary/10',
  },
  secondary: {
    gradient: 'from-secondary/5 via-secondary/10 to-secondary/5',
    iconBg: 'bg-secondary/15 text-secondary group-hover:bg-secondary/25',
    border: 'border-secondary/20 hover:border-secondary/40',
    buttonShadow: 'shadow-secondary/25 hover:shadow-secondary/40',
    blob: 'bg-secondary/10',
  },
  accent: {
    gradient: 'from-accent/5 via-accent/10 to-accent/5',
    iconBg: 'bg-accent/15 text-accent group-hover:bg-accent/25',
    border: 'border-accent/20 hover:border-accent/40',
    buttonShadow: 'shadow-accent/25 hover:shadow-accent/40',
    blob: 'bg-accent/10',
  },
  error: {
    gradient: 'from-error/5 via-error/10 to-error/5',
    iconBg: 'bg-error/15 text-error group-hover:bg-error/25',
    border: 'border-error/20 hover:border-error/40',
    buttonShadow: 'shadow-error/25 hover:shadow-error/40',
    blob: 'bg-error/10',
  },
  warning: {
    gradient: 'from-warning/5 via-warning/10 to-warning/5',
    iconBg: 'bg-warning/15 text-warning group-hover:bg-warning/25',
    border: 'border-warning/20 hover:border-warning/40',
    buttonShadow: 'shadow-warning/25 hover:shadow-warning/40',
    blob: 'bg-warning/10',
  },
  info: {
    gradient: 'from-info/5 via-info/10 to-info/5',
    iconBg: 'bg-info/15 text-info group-hover:bg-info/25',
    border: 'border-info/20 hover:border-info/40',
    buttonShadow: 'shadow-info/25 hover:shadow-info/40',
    blob: 'bg-info/10',
  },
  success: {
    gradient: 'from-success/5 via-success/10 to-success/5',
    iconBg: 'bg-success/15 text-success group-hover:bg-success/25',
    border: 'border-success/20 hover:border-success/40',
    buttonShadow: 'shadow-success/25 hover:shadow-success/40',
    blob: 'bg-success/10',
  },
};

// Aliases for semantic usage
variantStyles.noData = variantStyles.primary;
variantStyles.noResults = variantStyles.secondary;

/**
 * Modern empty state component with gradient backgrounds and SVG icons.
 * Supports primary and secondary actions for better user guidance.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = 'primary',
  className = '',
}) => {
  const styles = variantStyles[variant] || variantStyles.primary;

  return (
    <div
      data-testid="empty-state"
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
        <div className={`absolute top-1/4 left-1/4 w-32 h-32 ${styles.blob} rounded-full blur-3xl`} />
        <div className={`absolute bottom-1/4 right-1/4 w-40 h-40 ${styles.blob} rounded-full blur-3xl`} />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Icon container with animation */}
        {Icon && (
          <div
            className={`
              p-4 rounded-2xl mb-6
              ${styles.iconBg}
              transition-all duration-300 ease-out
              shadow-lg shadow-current/5
            `}
          >
            <Icon className="w-12 h-12" strokeWidth={1.5} />
          </div>
        )}

        <h3 className="text-xl font-semibold mb-2 text-base-content">
          {title}
        </h3>

        <p className="text-base-content/60 max-w-md mb-8">
          {description}
        </p>

        {/* Action buttons */}
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
            {primaryAction && (
              <Button
                variant={primaryAction.variant || (variant === 'primary' || variant === 'secondary' || variant === 'accent' ? variant : 'primary')}
                buttonStyle={primaryAction.buttonStyle || 'solid'}
                onClick={primaryAction.onClick}
                className={`gap-2 shadow-lg ${styles.buttonShadow} transition-shadow`}
                startIcon={primaryAction.icon ? <primaryAction.icon className="w-4 h-4" /> : undefined}
              >
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant={secondaryAction.variant || 'ghost'}
                buttonStyle={secondaryAction.buttonStyle || 'outline'}
                onClick={secondaryAction.onClick}
                className="gap-2"
                startIcon={secondaryAction.icon ? <secondaryAction.icon className="w-4 h-4" /> : undefined}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyState;

// Pre-configured variants for common use cases

export interface NoItemsFoundProps {
  searchQuery?: string;
  onClearSearch?: () => void;
  onCreateNew?: () => void;
  createLabel?: string;
  itemType?: string;
}

/**
 * Empty state for when no items match a search query
 */
export const NoItemsFound: React.FC<NoItemsFoundProps> = ({
  searchQuery,
  onClearSearch,
  onCreateNew,
  createLabel = 'Create New',
  itemType = 'items',
}) => {
  return (
    <EmptyState
      icon={Search}
      title="No items found"
      description={
        searchQuery
          ? `No ${itemType} match "${searchQuery}". Try adjusting your search or filters.`
          : `No ${itemType} found.`
      }
      variant="noResults"
      primaryAction={
        onClearSearch && searchQuery
          ? {
              label: 'Clear Search',
              icon: RefreshCw,
              onClick: onClearSearch,
              variant: 'secondary',
            }
          : undefined
      }
      secondaryAction={
        onCreateNew
          ? {
              label: createLabel,
              onClick: onCreateNew,
              variant: 'ghost',
            }
          : undefined
      }
    />
  );
};

export interface NoConfigurationProps {
  title?: string;
  description?: string;
  onSetup: () => void;
  setupLabel?: string;
  onLearnMore?: () => void;
}

/**
 * Empty state for first-time setup scenarios
 */
export const NoConfiguration: React.FC<NoConfigurationProps> = ({
  title = 'No configuration yet',
  description = 'Get started by setting up your first configuration. This will only take a moment.',
  onSetup,
  setupLabel = 'Get Started',
  onLearnMore,
}) => {
  return (
    <EmptyState
      icon={Settings}
      title={title}
      description={description}
      variant="noData"
      primaryAction={{
        label: setupLabel,
        icon: Settings,
        onClick: onSetup,
        variant: 'primary',
      }}
      secondaryAction={
        onLearnMore
          ? {
              label: 'Learn More',
              icon: FileQuestion,
              onClick: onLearnMore,
              variant: 'ghost',
            }
          : undefined
      }
    />
  );
};

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry: () => void;
  onContactSupport?: () => void;
  errorMessage?: string;
}

/**
 * Empty state for error conditions
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description = 'We encountered an error while loading this content. Please try again.',
  onRetry,
  onContactSupport,
  errorMessage,
}) => {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={errorMessage || description}
      variant="error"
      primaryAction={{
        label: 'Try Again',
        icon: RefreshCw,
        onClick: onRetry,
        variant: 'primary',
      }}
      secondaryAction={
        onContactSupport
          ? {
              label: 'Contact Support',
              onClick: onContactSupport,
              variant: 'ghost',
            }
          : undefined
      }
    />
  );
};
