import React from 'react';

interface DashboardTabsProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="tabs tabs-boxed mb-6 bg-base-100 p-1 gap-1 inline-flex">
      <a
        className={`tab ${activeTab === 'getting-started' ? 'tab-active font-bold' : ''}`}
        onClick={() => setActiveTab('getting-started')}
      >
        Getting Started
      </a>
      <a
        className={`tab ${activeTab === 'status' ? 'tab-active font-bold' : ''}`}
        onClick={() => setActiveTab('status')}
      >
        Status
      </a>
      <a
        className={`tab ${activeTab === 'performance' ? 'tab-active font-bold' : ''}`}
        onClick={() => setActiveTab('performance')}
      >
        Performance
      </a>
    </div>
  );
};
