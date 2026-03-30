import React, { useEffect, useState } from 'react';
import { Clock, AlertCircle, X } from 'lucide-react';

/**
 * TimeoutIndicator - Shows elapsed time and warning when operation takes too long
 */
export interface TimeoutIndicatorProps {
  isLoading: boolean;
  timeoutMs?: number;
  onTimeout?: () => void;
  className?: string;
}

export const TimeoutIndicator: React.FC<TimeoutIndicatorProps> = ({
  isLoading,
  timeoutMs = 30000,
  onTimeout,
  className = '',
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setShowWarning(false);
      setElapsed(0);
      return;
    }

    const startTime = Date.now();
    const timer = setInterval(() => {
      const currentElapsed = Date.now() - startTime;
      setElapsed(currentElapsed);
      if (currentElapsed > timeoutMs && !showWarning) {
        setShowWarning(true);
        onTimeout?.();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isLoading, timeoutMs, onTimeout, showWarning]);

  if (!isLoading) return null;

  return (
    <div
      className={`flex items-center gap-2 text-sm ${showWarning ? 'text-warning' : 'text-base-content/60'} ${className}`}
      role="status"
      aria-live="polite"
    >
      <Clock className="w-4 h-4" aria-hidden="true" />
      <span>{(elapsed / 1000).toFixed(1)}s</span>
      {showWarning && (
        <span className="text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          Taking longer than expected
        </span>
      )}
    </div>
  );
};

/**
 * ProgressBar - Shows determinate progress with optional label
 */
export interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  showCount?: boolean;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label,
  showPercentage = true,
  showCount = false,
  variant = 'primary',
  size = 'md',
  className = '',
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const progressClass = `progress progress-${variant}`;
  const sizeClass = size !== 'md' ? `progress-${size}` : '';

  return (
    <div className={`space-y-1 ${className}`} role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={total}>
      {label && (
        <div className="text-sm font-medium flex items-center justify-between">
          <span>{label}</span>
          {showCount && (
            <span className="text-xs opacity-60">
              {current} / {total}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <progress
          className={`${progressClass} ${sizeClass} flex-1`}
          value={current}
          max={total}
        ></progress>
        {showPercentage && (
          <span className="text-xs font-mono w-12 text-right" aria-label={`${percentage} percent complete`}>
            {percentage}%
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * LoadingOverlay - Full-screen loading overlay with optional cancel
 */
export interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  allowCancel?: boolean;
  onCancel?: () => void;
  showProgress?: boolean;
  progress?: number;
  total?: number;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message,
  allowCancel,
  onCancel,
  showProgress,
  progress,
  total,
  className = '',
}) => {
  if (!isLoading) return null;

  return (
    <div className={`fixed inset-0 bg-base-300/50 backdrop-blur-sm z-50 flex items-center justify-center ${className}`} role="dialog" aria-modal="true" aria-label="Loading">
      <div className="bg-base-100 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary" aria-hidden="true"></span>
          {message && <p className="text-center">{message}</p>}
          {showProgress && progress !== undefined && total !== undefined && (
            <div className="w-full">
              <ProgressBar current={progress} total={total} showPercentage showCount />
            </div>
          )}
          {allowCancel && onCancel && (
            <button className="btn btn-sm btn-outline" onClick={onCancel} aria-label="Cancel operation">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * OperationStatus - Shows inline operation status with optional cancel
 */
export interface OperationStatusProps {
  isLoading: boolean;
  operation: string;
  elapsedTime?: number;
  showTimeout?: boolean;
  timeoutMs?: number;
  allowCancel?: boolean;
  onCancel?: () => void;
  variant?: 'info' | 'warning' | 'error' | 'success';
  className?: string;
}

export const OperationStatus: React.FC<OperationStatusProps> = ({
  isLoading,
  operation,
  elapsedTime,
  showTimeout = true,
  timeoutMs = 30000,
  allowCancel,
  onCancel,
  variant = 'info',
  className = '',
}) => {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (elapsedTime && elapsedTime > timeoutMs) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [elapsedTime, timeoutMs]);

  if (!isLoading) return null;

  const alertClass = showWarning ? 'alert-warning' : `alert-${variant}`;

  return (
    <div className={`alert ${alertClass} ${className}`} role="status" aria-live="polite">
      <span className="loading loading-spinner loading-sm" aria-hidden="true"></span>
      <div className="flex-1">
        <p className="font-medium">{operation}</p>
        {showTimeout && elapsedTime !== undefined && (
          <p className="text-xs opacity-70">
            {(elapsedTime / 1000).toFixed(1)}s elapsed
            {showWarning && ' - Taking longer than expected'}
          </p>
        )}
      </div>
      {allowCancel && onCancel && (
        <button
          className="btn btn-sm btn-ghost"
          onClick={onCancel}
          aria-label={`Cancel ${operation}`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

/**
 * InlineLoader - Small inline loading indicator
 */
export interface InlineLoaderProps {
  isLoading: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({
  isLoading,
  size = 'sm',
  text,
  className = '',
}) => {
  if (!isLoading) return null;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`} role="status" aria-label={text || 'Loading'}>
      <span className={`loading loading-spinner loading-${size}`} aria-hidden="true"></span>
      {text && <span className="text-sm">{text}</span>}
    </span>
  );
};

/**
 * LoadingButton - Button with built-in loading state
 */
export interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'link' | 'info' | 'success' | 'warning' | 'error';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  loadingText,
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  className = '',
  ...props
}) => {
  const variantClass = variant !== 'primary' ? `btn-${variant}` : 'btn-primary';
  const sizeClass = size !== 'md' ? `btn-${size}` : '';

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="loading loading-spinner loading-sm" aria-hidden="true"></span>
          {loadingText || 'Loading...'}
        </>
      ) : (
        children
      )}
    </button>
  );
};

/**
 * LoadingCard - Card with skeleton loading state
 */
export interface LoadingCardProps {
  isLoading: boolean;
  children: React.ReactNode;
  skeletonLines?: number;
  className?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({
  isLoading,
  children,
  skeletonLines = 3,
  className = '',
}) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className={`card bg-base-100 shadow-xl ${className}`} role="status" aria-label="Loading">
      <div className="card-body">
        <div className="flex items-center gap-4 mb-4">
          <div className="skeleton w-12 h-12 rounded-full shrink-0" aria-hidden="true"></div>
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-3/4" aria-hidden="true"></div>
            <div className="skeleton h-3 w-1/2" aria-hidden="true"></div>
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: skeletonLines }).map((_, i) => (
            <div key={i} className="skeleton h-3 w-full" aria-hidden="true"></div>
          ))}
        </div>
      </div>
    </div>
  );
};
