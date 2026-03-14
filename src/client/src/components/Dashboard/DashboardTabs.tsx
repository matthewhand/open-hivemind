import React from 'react';
import { Activity, LayoutDashboard, Zap } from 'lucide-react';

export type DashboardTab = 'getting-started' | 'status' | 'performance';

export interface DashboardTabsProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="tabs tabs-boxed mb-6 p-1 bg-base-200 w-full sm:w-auto overflow-x-auto flex-nowrap hide-scrollbar border border-base-content/5 shadow-sm rounded-lg">
      <button
        className={`tab tab-lg flex-1 sm:flex-none whitespace-nowrap px-6 transition-all duration-200 ${
          activeTab === 'getting-started' ? 'tab-active font-semibold shadow-sm' : 'hover:bg-base-300'
        }`}
        onClick={() => setActiveTab('getting-started')}
      >
        <LayoutDashboard className="w-5 h-5 mr-2 opacity-70" />
        Quick Start
      </button>
      <button
        className={`tab tab-lg flex-1 sm:flex-none whitespace-nowrap px-6 transition-all duration-200 ${
          activeTab === 'status' ? 'tab-active font-semibold shadow-sm' : 'hover:bg-base-300'
        }`}
        onClick={() => setActiveTab('status')}
      >
        <Activity className="w-5 h-5 mr-2 opacity-70" />
        Live Status
      </button>
      <button
        className={`tab tab-lg flex-1 sm:flex-none whitespace-nowrap px-6 transition-all duration-200 ${
          activeTab === 'performance' ? 'tab-active font-semibold shadow-sm' : 'hover:bg-base-300'
        }`}
        onClick={() => setActiveTab('performance')}
      >
        <Zap className="w-5 h-5 mr-2 opacity-70" />
        Performance Analytics
      </button>
    </div>
  );
};
