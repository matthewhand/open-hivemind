import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/DaisyUI/Loading';

const BotsPage = lazy(() => import('./BotsPage'));
const PersonasPage = lazy(() => import('./PersonasPage'));
const GuardsPage = lazy(() => import('./GuardsPage'));

type Tab = 'bots' | 'personas' | 'guards';

const TABS: { key: Tab; label: string }[] = [
  { key: 'bots', label: 'Bots' },
  { key: 'personas', label: 'Personas' },
  { key: 'guards', label: 'Guards' },
];

const TabFallback: React.FC = () => (
  <div className="flex justify-center items-center min-h-[200px]">
    <LoadingSpinner size="lg" />
  </div>
);

const BotsManagementPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as Tab) || 'bots';

  const handleTabChange = (tab: Tab) => {
    if (tab === 'bots') {
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
        {activeTab === 'bots' && <BotsPage />}
        {activeTab === 'personas' && <PersonasPage />}
        {activeTab === 'guards' && <GuardsPage />}
      </Suspense>
    </div>
  );
};

export default BotsManagementPage;
