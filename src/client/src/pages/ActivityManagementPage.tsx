import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../components/DaisyUI/Card';
import Tabs from '../components/DaisyUI/Tabs';
import { LoadingSpinner } from '../components/DaisyUI/Loading';

const ActivityPage = lazy(() => import('./ActivityPage'));
const MonitoringPage = lazy(() => import('./MonitoringPage'));
const MonitoringDashboard = lazy(() => import('./MonitoringDashboard'));

const TABS = [
  { key: 'feed', label: 'Feed' },
  { key: 'monitoring', label: 'Monitoring' },
  { key: 'live', label: 'Live Dashboard' },
];

const ActivityManagementPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'feed';

  const handleTabChange = (tab: string) => {
    setSearchParams(tab === 'feed' ? {} : { tab }, { replace: true });
  };

  return (
    <div className="p-6">
      <Card className="shadow-xl">
        <Tabs
          variant="lifted"
          tabs={TABS}
          activeTab={activeTab}
          onChange={handleTabChange}
          className="mb-6"
        />
        <div className="mt-4">
          <Suspense fallback={<div className="flex justify-center items-center min-h-[200px]"><LoadingSpinner size="lg" /></div>}>
            {activeTab === 'feed' && <ActivityPage />}
            {activeTab === 'monitoring' && <MonitoringPage />}
            {activeTab === 'live' && <MonitoringDashboard />}
          </Suspense>
        </div>
      </Card>
    </div>
  );
};

export default ActivityManagementPage;
