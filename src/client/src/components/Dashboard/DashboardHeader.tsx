import React from 'react';
import { Button } from '../DaisyUI/Button';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface DashboardHeaderProps {
  handleOpenCreateModal: () => void;
  isModalDataLoading: boolean;
  handleRefresh: () => void;
  refreshing: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  handleOpenCreateModal,
  isModalDataLoading,
  handleRefresh,
  refreshing
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-base-content/70 mt-1">Overview of your Hivemind system</p>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleRefresh}
          variant="ghost"
          disabled={refreshing}
          startIcon={<ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
        <Button
          onClick={handleOpenCreateModal}
          variant="primary"
          disabled={isModalDataLoading}
          startIcon={<PlusIcon className="w-5 h-5" />}
        >
          Create Bot
        </Button>
      </div>
    </div>
  );
};
