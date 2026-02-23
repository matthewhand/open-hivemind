import React from 'react';
import { LucideIcon } from 'lucide-react';
import PageHeader from '../DaisyUI/PageHeader';
import { LoadingSpinner } from '../DaisyUI/Loading';
import { Alert } from '../DaisyUI/Alert';

interface PageContainerProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  loading?: boolean;
  error?: Error | string | null;
  actions?: React.ReactNode;
  children: React.ReactNode;
  onRefresh?: () => void;
  gradient?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
}

export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  description,
  icon,
  loading,
  error,
  actions,
  children,
  onRefresh,
  gradient = 'primary',
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <LoadingSpinner size="lg" />
        <span className="text-base-content/70">Loading {title}...</span>
      </div>
    );
  }

  // Handle Error
  if (error) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    return (
      <div className="space-y-6">
        <PageHeader
          title={title}
          description={description}
          icon={icon}
          actions={actions}
          gradient={gradient}
        />
        <div className="flex flex-col gap-4">
          <Alert
            status="error"
            message={errorMessage}
          />
          {onRefresh && (
            <div className="flex justify-center">
              <button className="btn btn-primary" onClick={onRefresh}>
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        icon={icon}
        actions={actions}
        gradient={gradient}
      />
      {children}
    </div>
  );
};
