import React from 'react';
import Button from '../DaisyUI/Button';
import { Alert } from '../DaisyUI/Alert';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface AdminPageLayoutProps {
  title: string;
  description: string;
  onRefresh: () => void;
  error: string | null;
  onErrorClose: () => void;
  loading: boolean;
  children: React.ReactNode;
}

const AdminPageLayout: React.FC<AdminPageLayoutProps> = ({
  title,
  description,
  onRefresh,
  error,
  onErrorClose,
  loading,
  children,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <span className="loading loading-spinner loading-lg" aria-hidden="true"></span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-base-content/60">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onRefresh} startIcon={<ArrowPathIcon className="w-5 h-5" />}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert status="error" message={error} onClose={onErrorClose} />
        </div>
      )}

      {children}
    </div>
  );
};

export default AdminPageLayout;
