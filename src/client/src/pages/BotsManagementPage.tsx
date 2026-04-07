import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../components/DaisyUI/Card';
import Tabs from '../components/DaisyUI/Tabs';
import { LoadingSpinner } from '../components/DaisyUI/Loading';

const BotsPage = lazy(() => import('./BotsPage'));
const PersonasPage = lazy(() => import('./PersonasPage'));
const GuardsPage = lazy(() => import('./GuardsPage'));

const TABS = [
  { key: 'bots', label: 'Bots' },
  { key: 'personas', label: 'Personas' },
  { key: 'guards', label: 'Guards' },
];

const BotsManagementPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'bots';

  const handleTabChange = (tab: string) => {
    setSearchParams(tab === 'bots' ? {} : { tab }, { replace: true });
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
            {activeTab === 'bots' && <BotsPage />}
            {activeTab === 'personas' && <PersonasPage />}
            {activeTab === 'guards' && <GuardsPage />}
          </Suspense>
        </div>
      </Card>
    </div>
  );
};

export default BotsManagementPage;
