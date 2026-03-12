import React from 'react';
import PageHeader from '../DaisyUI/PageHeader';
import { LayoutDashboard, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../DaisyUI/Button';

interface DashboardHeaderProps {
  handleOpenCreateModal: () => void;
  isModalDataLoading: boolean;
  handleRefresh: () => void;
  refreshing: boolean;
  title?: string;
  description?: string;
  createLabel?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  handleOpenCreateModal,
  isModalDataLoading,
  handleRefresh,
  refreshing,
  title = 'Command Center',
  description = 'Unified view of your bots, personas, LLMs, and system status',
  createLabel = 'Create Bot',
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-base-100 rounded-2xl p-6 md:p-8 mb-6 border border-primary/10">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <PageHeader
          title={title}
          description={description}
          icon={<LayoutDashboard className="w-8 h-8 text-primary" />}
        />
        <div className="flex gap-3">
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            disabled={refreshing}
            startIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
            className="hidden md:flex"
            aria-label="Refresh dashboard data"
          >
            Refresh
          </Button>
          <Button
            onClick={handleOpenCreateModal}
            variant="primary"
            startIcon={<Plus className="w-4 h-4" />}
            loading={isModalDataLoading}
            disabled={isModalDataLoading}
            aria-label="Create new bot"
          >
            {createLabel}
          </Button>
        </div>
      </div>
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
    </div>
  );
};
