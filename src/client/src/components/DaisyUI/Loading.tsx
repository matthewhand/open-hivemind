import React from 'react';
import {
  SkeletonAvatar as _SkeletonAvatar,
  SkeletonText as _SkeletonText,
  SkeletonCard as _LoadingSkeletonCard,
  SkeletonTableLayout as _SkeletonTable,
  SkeletonStatsCards as _SkeletonStats,
} from './Skeleton';

// Loading Spinner Component
interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'ring' | 'ball' | 'bars' | 'infinity';
  color?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'spinner',
  color = 'primary',
  className = '',
}) => {
  const getSizeClass = () => {
    switch (size) {
    case 'xs': return 'loading-xs';
    case 'sm': return 'loading-sm';
    case 'md': return 'loading-md';
    case 'lg': return 'loading-lg';
    default: return 'loading-md';
    }
  };

  const getVariantClass = () => {
    switch (variant) {
    case 'spinner': return 'loading-spinner';
    case 'dots': return 'loading-dots';
    case 'ring': return 'loading-ring';
    case 'ball': return 'loading-ball';
    case 'bars': return 'loading-bars';
    case 'infinity': return 'loading-infinity';
    default: return 'loading-spinner';
    }
  };

  const getColorClass = () => `text-${color}`;

  return (
    <span
      className={`loading ${getVariantClass()} ${getSizeClass()} ${getColorClass()} ${className}`}
      aria-hidden="true"
    />
  );
};

// Legacy Loading component (alias for LoadingSpinner with different interface)
interface LoadingProps {
  type?: 'spinner' | 'dots' | 'ring' | 'ball' | 'bars' | 'infinity';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error';
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  type = 'spinner',
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  return <LoadingSpinner variant={type} size={size} color={color} className={className} />;
};

// Progress Component
interface ProgressProps {
  value?: number;
  max?: number;
  variant?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
  showValue?: boolean;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value = 0,
  max = 100,
  variant = 'primary',
  size = 'md',
  indeterminate = false,
  showValue = false,
  className = '',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const getSizeClass = () => {
    switch (size) {
    case 'xs': return 'h-1';
    case 'sm': return 'h-2';
    case 'md': return 'h-3';
    case 'lg': return 'h-4';
    default: return 'h-3';
    }
  };

  const getVariantClass = () => `progress-${variant}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <progress
        className={`progress ${getVariantClass()} ${getSizeClass()} flex-1`}
        value={indeterminate ? undefined : percentage}
        max="100"
        aria-label={indeterminate ? 'Loading in progress' : `Progress: ${Math.round(percentage)}%`}
      />
      {showValue && !indeterminate && (
        <span className="text-sm font-medium min-w-[3rem] text-right" aria-hidden="true">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};

// Loading Overlay Component
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  message = 'Loading...',
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-base-100/80 backdrop-blur-sm flex items-center justify-center z-10" role="status" aria-live="polite">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-2 text-base-content/70">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Step Progress Component
interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  steps?: { label: string; description?: string }[];
  variant?: 'primary' | 'secondary' | 'accent' | 'success';
  className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  totalSteps,
  steps,
  variant = 'primary',
  className = '',
}) => {
  const getVariantClass = () => `step-${variant}`;

  return (
    <div className={`w-full ${className}`}>
      <ul className={`steps w-full ${steps ? 'steps-vertical lg:steps-horizontal' : ''}`}>
        {(steps || Array.from({ length: totalSteps }, (_, i) => ({ label: `Step ${i + 1}`, description: undefined }))).map((step, index) => (
          <li
            key={index}
            className={`step ${index < currentStep ? getVariantClass() : ''} ${
              index === currentStep - 1 ? 'step-primary' : ''
            }`}
            data-content={index < currentStep ? '\u2713' : index + 1}
          >
            <div className="text-left">
              <div className="font-medium">{step.label}</div>
              {step.description && (
                <div className="text-sm text-base-content/60">{step.description}</div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Progress bar */}
      <div className="mt-4">
        <Progress
          value={currentStep}
          max={totalSteps}
          variant={variant}
          showValue
        />
      </div>
    </div>
  );
};

// Loading Spinner with message (replaces standalone LoadingSpinner.tsx wrapper)
interface LoadingSpinnerWithMessageProps {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export const LoadingSpinnerWithMessage: React.FC<LoadingSpinnerWithMessageProps> = ({
  message = 'Loading...',
  size = 'md',
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4 p-6">
      <LoadingSpinner color="primary" size={size} />
      {message && (
        <p className="text-sm text-base-content/70">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        {content}
      </div>
    );
  }

  return content;
};

// Re-export skeleton components from Skeleton.tsx for backward compatibility.
// All skeleton primitives and layouts now live in Skeleton.tsx.
export const SkeletonText = _SkeletonText;
export const LoadingSkeletonCard = _LoadingSkeletonCard;
export const SkeletonAvatar = _SkeletonAvatar;
export const SkeletonTable = _SkeletonTable;
export const SkeletonStats = _SkeletonStats;

export default {
  Loading,
  LoadingSpinner,
  Progress,
  SkeletonText,
  LoadingSkeletonCard,
  SkeletonAvatar,
  SkeletonTable,
  SkeletonStats,
  LoadingOverlay,
  StepProgress,
  LoadingSpinnerWithMessage,
};
