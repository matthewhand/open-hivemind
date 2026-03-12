import React from 'react';
import { Activity, LayoutGrid, Settings, Bot } from 'lucide-react';

export type DashboardTab = 'status' | 'bots' | 'quick-actions' | 'system';

interface DashboardTabsProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'status', label: 'System Status', icon: <Activity className="w-4 h-4" /> },
    { id: 'bots', label: 'Active Bots', icon: <Bot className="w-4 h-4" /> },
    { id: 'quick-actions', label: 'Quick Actions', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'system', label: 'System Info', icon: <Settings className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="bg-base-100/50 backdrop-blur-sm sticky top-[72px] z-30 pt-4 pb-2 -mt-4 mb-4">
      <div className="tabs tabs-boxed w-full md:w-auto overflow-x-auto rounded-xl p-1 bg-base-200 shadow-inner flex flex-nowrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-testid={`${tab.id}-tab`}
            className={`tab flex items-center gap-2 flex-nowrap whitespace-nowrap px-4 py-2 ${
              activeTab === tab.id ? 'tab-active font-bold' : ''
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};
