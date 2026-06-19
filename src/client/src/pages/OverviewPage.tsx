import React, { lazy, Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import Tabs from '../components/DaisyUI/Tabs';
import Toggle from '../components/DaisyUI/Toggle';
import Dashboard from '../components/Dashboard';
import DashboardWidgetSystem from '../components/DaisyUI/DashboardWidgetSystem';
import GettingStarted from '../components/GettingStarted';
import QuickActions from '../components/QuickActions';

const SystemHealth = lazy(() => import('../components/SystemHealth'));
const ActivityPage = lazy(() => import('./ActivityPage'));
const MonitoringDashboard = lazy(() => import('./MonitoringDashboard'));

const SuspenseFallback: React.FC = () => (
  <div className="flex justify-center items-center min-h-[200px]">
    <LoadingSpinner size="lg" />
  </div>
);

const OverviewPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [useWidgetLayout, setUseWidgetLayout] = useState(() => {
    const saved = localStorage.getItem('hivemind-dashboard-layout');
    return saved === 'widget';
  });

  // Bumped by QuickActions (e.g. toggling demo mode) to force the dashboard to refetch.
  const [refreshKey, setRefreshKey] = useState(0);

  // Getting Started panel dismissal — persisted to localStorage so it stays hidden
  // across sessions (same key/behavior as the Dashboard page's panel).
  const [showGettingStarted, setShowGettingStarted] = useState(
    () => localStorage.getItem('hivemind-hide-getting-started') !== 'true'
  );
  const dismissGettingStarted = () => {
    localStorage.setItem('hivemind-hide-getting-started', 'true');
    setShowGettingStarted(false);
  };
  const restoreGettingStarted = () => {
    localStorage.removeItem('hivemind-hide-getting-started');
    setShowGettingStarted(true);
  };

  const tabs = useMemo(() => [
    { key: 'overview',      label: 'Overview'       },
    { key: 'activity',      label: 'Activity'       },
    { key: 'monitoring',    label: 'Monitoring'     },
    { key: 'getting-started', label: 'Getting Started' },
  ], []);

  const setTab = (tab: string) => {
    if (tab === 'overview') {
      searchParams.delete('tab');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ tab });
    }
  };

  return (
    <div>
      <Tabs
        variant="lifted"
        tabs={tabs}
        activeTab={activeTab}
        onChange={setTab}
        className="mb-6"
      />

      {activeTab === 'overview' && (
        <div>
          <div className="flex items-center justify-end mb-4">
            <div className="flex items-center gap-3 bg-base-100/50 p-2 rounded-lg shadow-sm">
              <span className="text-sm font-medium opacity-80">Static</span>
              <Toggle
                color="primary"
                checked={useWidgetLayout}
                onChange={(e) => {
                  setUseWidgetLayout(e.target.checked);
                  localStorage.setItem('hivemind-dashboard-layout', e.target.checked ? 'widget' : 'static');
                }}
                aria-label="Toggle widget dashboard layout"
              />
              <span className="text-sm font-medium text-primary">Widgets</span>
            </div>
          </div>

          <QuickActions onRefresh={() => setRefreshKey((k) => k + 1)} />

          <div className="animate-in fade-in duration-300" key={refreshKey}>
            {useWidgetLayout ? <DashboardWidgetSystem /> : <Dashboard />}
          </div>

          <div className="divider" />

          <div>
            <Suspense fallback={<SuspenseFallback />}>
              <SystemHealth refreshInterval={30000} />
            </Suspense>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <Suspense fallback={<SuspenseFallback />}>
          <ActivityPage />
        </Suspense>
      )}

      {activeTab === 'monitoring' && (
        <Suspense fallback={<SuspenseFallback />}>
          <MonitoringDashboard />
        </Suspense>
      )}

      {activeTab === 'getting-started' && (
        showGettingStarted ? (
          <GettingStarted onDismiss={dismissGettingStarted} />
        ) : (
          <div className="text-center text-base-content/60 py-12">
            <p className="mb-3">You&apos;ve dismissed the setup guide.</p>
            <button className="btn btn-sm btn-ghost border border-base-300" onClick={restoreGettingStarted}>
              Show getting started
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default OverviewPage;
