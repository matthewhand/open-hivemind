import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../components/DaisyUI/Card';
import Tabs from '../components/DaisyUI/Tabs';
import { LoadingSpinner } from '../components/DaisyUI/Loading';

const LLMProvidersPage = lazy(() => import('./LLMProvidersPage'));
const MessageProvidersPage = lazy(() => import('./MessageProvidersPage'));
const MemoryProvidersPage = lazy(() => import('./MemoryProvidersPage'));
const ToolProvidersPage = lazy(() => import('./ToolProvidersPage'));

const TABS = [
  { key: 'llm', label: 'LLM' },
  { key: 'message', label: 'Message' },
  { key: 'memory', label: 'Memory' },
  { key: 'tool', label: 'Tool' },
];

const ProvidersManagementPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'llm';

  const handleTabChange = (tab: string) => {
    setSearchParams(tab === 'llm' ? {} : { tab }, { replace: true });
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
            {activeTab === 'llm' && <LLMProvidersPage />}
            {activeTab === 'message' && <MessageProvidersPage />}
            {activeTab === 'memory' && <MemoryProvidersPage />}
            {activeTab === 'tool' && <ToolProvidersPage />}
          </Suspense>
        </div>
      </Card>
    </div>
  );
};

export default ProvidersManagementPage;
