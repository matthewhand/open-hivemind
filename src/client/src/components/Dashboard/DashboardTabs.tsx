import React from 'react';
import { Activity, LayoutDashboard, Zap } from 'lucide-react';

interface DashboardTabsProps {
  activeTab: 'getting-started' | 'status' | 'performance';
  setActiveTab: (tab: 'getting-started' | 'status' | 'performance') => void;
}

export function DashboardTabs({ activeTab, setActiveTab }: DashboardTabsProps) {
  return (
    <div role="tablist" className="tabs tabs-bordered tabs-lg overflow-x-auto overflow-y-hidden pt-2 pb-px border-b border-base-300 w-full flex-nowrap shrink-0 max-w-full">
      <button
        role="tab"
        id="dashboard-tab-getting-started"
        aria-controls="dashboard-panel-getting-started"
        aria-selected={activeTab === 'getting-started'}
        className={`tab whitespace-nowrap min-w-max flex-shrink-0 flex items-center gap-2 pb-2 h-auto ${activeTab === 'getting-started' ? 'tab-active font-semibold' : ''}`}
        onClick={() => setActiveTab('getting-started')}
      >
        <LayoutDashboard className="w-4 h-4" />
        Quick Actions
      </button>
      <button
        role="tab"
        id="dashboard-tab-status"
        aria-controls="dashboard-panel-status"
        aria-selected={activeTab === 'status'}
        className={`tab whitespace-nowrap min-w-max flex-shrink-0 flex items-center gap-2 pb-2 h-auto ${activeTab === 'status' ? 'tab-active font-semibold' : ''}`}
        onClick={() => setActiveTab('status')}
      >
        <Activity className="w-4 h-4" />
        Agent Status
      </button>
      <button
        role="tab"
        id="dashboard-tab-performance"
        aria-controls="dashboard-panel-performance"
        aria-selected={activeTab === 'performance'}
        className={`tab whitespace-nowrap min-w-max flex-shrink-0 flex items-center gap-2 pb-2 h-auto ${activeTab === 'performance' ? 'tab-active font-semibold' : ''}`}
        onClick={() => setActiveTab('performance')}
      >
        <Zap className="w-4 h-4" />
        Swarm Metrics
      </button>
    </div>
  );
}
