import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/DaisyUI/Loading';

const ActivityPage = lazy(() => import('./ActivityPage'));
const MonitoringPage = lazy(() => import('./MonitoringPage'));
const MonitoringDashboard = lazy(() => import('./MonitoringDashboard'));

type Tab = 'feed' | 'monitoring' | 'monitoring-dashboard';

const TABS: { key: Tab; label: string }[] = [
  { key: 'feed', label: 'Feed' },
  { key: 'monitoring', label: 'Monitoring' },
  { key: 'monitoring-dashboard', label: 'Live Dashboard' },
];

const TabFallback: React.FC = () => (
  <div className="flex justify-center items-center min-h-[200px]">
    <LoadingSpinner size="lg" />
  </div>
);

const ActivityManagementPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as Tab) || 'feed';

  const handleTabChange = (tab: Tab) => {
    if (tab === 'feed') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  return (
    <div className="space-y-6">
      <div role="tablist" className="tabs tabs-boxed bg-base-200 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            className={`tab ${activeTab === key ? 'tab-active' : ''}`}
            onClick={() => handleTabChange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <Suspense fallback={<TabFallback />}>
        {activeTab === 'feed' && <ActivityPage />}
        {activeTab === 'monitoring' && <MonitoringPage />}
        {activeTab === 'monitoring-dashboard' && <MonitoringDashboard />}
      </Suspense>
    </div>
  );
};

export default ActivityManagementPage;
