import React from 'react';
import Button from '../DaisyUI/Button';
import { RotateCcw } from 'lucide-react';

export interface DashboardHeaderProps {
  handleOpenCreateModal: () => void;
  isModalDataLoading: boolean;
  handleRefresh: () => void;
  refreshing: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  handleOpenCreateModal,
  isModalDataLoading,
  handleRefresh,
  refreshing,
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-gradient-to-r from-base-200 to-base-300 rounded-box shadow-sm mb-6 border border-base-content/5">
      <div className="flex-1">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
          System Dashboard
        </h1>
        <p className="text-base-content/70 mt-1">Overview of your Hivemind system status</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0 w-full md:w-auto">
        <Button variant="primary" onClick={handleOpenCreateModal} disabled={isModalDataLoading}>
          {isModalDataLoading ? 'Loading Options...' : 'Quick Create Bot'}
        </Button>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RotateCcw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Status'}
        </Button>
      </div>
    </div>
  );
};
