import React from 'react';
import Button from '../DaisyUI/Button';
import { Plus, RefreshCw } from 'lucide-react';

interface DashboardHeaderProps {
  handleOpenCreateModal: () => void;
  isModalDataLoading: boolean;
  refreshing: boolean;
  fetchData: () => Promise<void>;
}

export function DashboardHeader({
  handleOpenCreateModal,
  isModalDataLoading,
  refreshing,
  fetchData
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-box border border-base-200">
      <div>
        <h1 className="text-3xl font-bold text-base-content">
          Swarm Command Center
        </h1>
        <p className="mt-2 text-base-content/70">
          Monitor, manage, and scale your autonomous multi-agent systems.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={handleOpenCreateModal}
          loading={isModalDataLoading}
          startIcon={<Plus className="w-5 h-5" />}
        >
          Create Agent
        </Button>
        <Button
          variant="ghost"
          onClick={fetchData}
          loading={refreshing}
          startIcon={<RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />}
        >
          Refresh Data
        </Button>
      </div>
    </div>
  );
}
