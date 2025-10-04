import React from 'react';

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
  className = ''
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
      aria-label="Loading"
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
  className = ''
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
  className = ''
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
      />
      {showValue && !indeterminate && (
        <span className="text-sm font-medium min-w-[3rem] text-right">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};

// Skeleton Components
interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export const SkeletonText: React.FC<SkeletonProps & { 
  lines?: number; 
  width?: 'full' | '3/4' | '1/2' | '1/4';
}> = ({ 
  lines = 1, 
  width = 'full',
  animate = true,
  className = '' 
}) => {
  const getWidthClass = () => {
    switch (width) {
      case '3/4': return 'w-3/4';
      case '1/2': return 'w-1/2';
      case '1/4': return 'w-1/4';
      default: return 'w-full';
    }
  };

  const animateClass = animate ? 'animate-pulse' : '';

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div 
          key={index}
          className={`h-4 bg-base-300 rounded ${getWidthClass()} ${animateClass} ${
            index === lines - 1 && lines > 1 ? 'w-2/3' : ''
          }`}
        />
      ))}
    </div>
  );
};

export const LoadingSkeletonCard: React.FC<SkeletonProps> = ({
  animate = true,
  className = ''
}) => {
  const animateClass = animate ? 'animate-pulse' : '';

  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="card-body">
        <div className={`h-6 bg-base-300 rounded w-3/4 mb-4 ${animateClass}`} />
        <div className="space-y-2">
          <div className={`h-4 bg-base-300 rounded w-full ${animateClass}`} />
          <div className={`h-4 bg-base-300 rounded w-5/6 ${animateClass}`} />
          <div className={`h-4 bg-base-300 rounded w-2/3 ${animateClass}`} />
        </div>
        <div className="card-actions justify-end mt-4">
          <div className={`h-10 bg-base-300 rounded w-20 ${animateClass}`} />
          <div className={`h-10 bg-base-300 rounded w-24 ${animateClass}`} />
        </div>
      </div>
    </div>
  );
};

export const SkeletonAvatar: React.FC<SkeletonProps & { 
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
}> = ({ 
  size = 'md',
  shape = 'circle',
  animate = true,
  className = '' 
}) => {
  const getSizeClass = () => {
    switch (size) {
      case 'xs': return 'w-6 h-6';
      case 'sm': return 'w-8 h-8';
      case 'md': return 'w-12 h-12';
      case 'lg': return 'w-16 h-16';
      case 'xl': return 'w-20 h-20';
      default: return 'w-12 h-12';
    }
  };

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded';
  const animateClass = animate ? 'animate-pulse' : '';

  return (
    <div 
      className={`bg-base-300 ${getSizeClass()} ${shapeClass} ${animateClass} ${className}`}
    />
  );
};

export const SkeletonTable: React.FC<SkeletonProps & { 
  rows?: number;
  columns?: number;
}> = ({ 
  rows = 5,
  columns = 4,
  animate = true,
  className = '' 
}) => {
  const animateClass = animate ? 'animate-pulse' : '';

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index}>
                <div className={`h-4 bg-base-300 rounded w-24 ${animateClass}`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex}>
                  <div className={`h-4 bg-base-300 rounded w-32 ${animateClass}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const SkeletonStats: React.FC<SkeletonProps & { 
  count?: number;
}> = ({ 
  count = 4,
  animate = true,
  className = '' 
}) => {
  const animateClass = animate ? 'animate-pulse' : '';

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${count} gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="stats shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure">
              <div className={`w-8 h-8 bg-base-300 rounded ${animateClass}`} />
            </div>
            <div className={`stat-title h-4 bg-base-300 rounded w-20 mb-2 ${animateClass}`} />
            <div className={`stat-value h-8 bg-base-300 rounded w-16 mb-2 ${animateClass}`} />
            <div className={`stat-desc h-3 bg-base-300 rounded w-24 ${animateClass}`} />
          </div>
        </div>
      ))}
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
  message = "Loading...",
  className = ''
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-base-100/80 backdrop-blur-sm flex items-center justify-center z-10">
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
  className = ''
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
            data-content={index < currentStep ? "✓" : index + 1}
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
  StepProgress
};