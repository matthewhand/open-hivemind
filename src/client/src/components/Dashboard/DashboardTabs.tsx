import React from 'react';

export const DashboardTabs = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: any }) => (
  <div role="tablist" className="tabs tabs-boxed">
    <button data-testid="getting-started-tab" className={`tab ${activeTab === 'getting-started' ? 'tab-active' : ''}`} onClick={() => setActiveTab('getting-started')}>Getting Started</button>
    <button data-testid="status-tab" className={`tab ${activeTab === 'status' ? 'tab-active' : ''}`} onClick={() => setActiveTab('status')}>Status</button>
    <button data-testid="performance-tab" className={`tab ${activeTab === 'performance' ? 'tab-active' : ''}`} onClick={() => setActiveTab('performance')}>Performance</button>
  </div>
);
