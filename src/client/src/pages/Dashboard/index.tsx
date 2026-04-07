import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Dashboard from '../../components/Dashboard';
import SystemHealth from '../../components/SystemHealth';
import Breadcrumbs from '../../components/DaisyUI/Breadcrumbs';
import { LayoutDashboard, Activity } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'health', label: 'Health', icon: <Activity className="w-4 h-4" /> },
] as const;

type TabId = (typeof TABS)[number]['id'];

const DashboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabId) || 'dashboard';

  const breadcrumbItems = [{ label: 'Dashboard', href: '/dashboard', isActive: true }];

  const handleTabChange = (tabId: TabId) => {
    if (tabId === 'dashboard') {
      // Remove ?tab param for the default tab to keep URL clean
      searchParams.delete('tab');
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ tab: tabId }, { replace: true });
    }
  };

  return (
    <div>
      <Breadcrumbs items={breadcrumbItems} />

      {/* Tab Navigation */}
      <div role="tablist" className="tabs tabs-bordered mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            className={`tab gap-2 ${activeTab === tab.id ? 'tab-active font-semibold' : ''}`}
            onClick={() => handleTabChange(tab.id)}
            aria-selected={activeTab === tab.id}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'health' && <SystemHealth refreshInterval={30000} />}
    </div>
  );
};

export default DashboardPage;
