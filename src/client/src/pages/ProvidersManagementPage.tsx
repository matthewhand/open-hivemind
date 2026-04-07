import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Brain, MessageSquare, Database, Wrench } from 'lucide-react';
import { LoadingSpinner } from '../components/DaisyUI/Loading';

const LLMProvidersPage = lazy(() => import('./LLMProvidersPage'));
const MessageProvidersPage = lazy(() => import('./MessageProvidersPage'));
const MemoryProvidersPage = lazy(() => import('./MemoryProvidersPage'));
const ToolProvidersPage = lazy(() => import('./ToolProvidersPage'));

const TABS = [
  { key: 'llm', label: 'LLM', icon: Brain },
  { key: 'message', label: 'Message', icon: MessageSquare },
  { key: 'memory', label: 'Memory', icon: Database },
  { key: 'tool', label: 'Tool', icon: Wrench },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const ProvidersManagementPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (TABS.some(t => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'llm') as TabKey;

  const setTab = (tab: TabKey) => {
    setSearchParams(tab === 'llm' ? {} : { tab }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div role="tablist" className="tabs tabs-boxed bg-base-200 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            className={`tab gap-2 ${activeTab === key ? 'tab-active' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <Suspense fallback={<div className="flex justify-center items-center min-h-[200px]"><LoadingSpinner size="lg" /></div>}>
        {activeTab === 'llm' && <LLMProvidersPage />}
        {activeTab === 'message' && <MessageProvidersPage />}
        {activeTab === 'memory' && <MemoryProvidersPage />}
        {activeTab === 'tool' && <ToolProvidersPage />}
      </Suspense>
    </div>
  );
};

export default ProvidersManagementPage;
