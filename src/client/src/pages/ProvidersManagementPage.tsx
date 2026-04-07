/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import Breadcrumbs from '../components/DaisyUI/Breadcrumbs';
import { Brain, MessageSquare, Database, Wrench } from 'lucide-react';

const LLMProvidersPage = lazy(() => import('./LLMProvidersPage'));
const MessageProvidersPage = lazy(() => import('./MessageProvidersPage'));

// Memory and Tool providers reuse LLMProvidersPage for now (matches prior routing)
const MemoryProvidersPage = lazy(() => import('./LLMProvidersPage'));
const ToolProvidersPage = lazy(() => import('./LLMProvidersPage'));

const TABS = [
  { key: 'llm', label: 'LLM', icon: Brain },
  { key: 'message', label: 'Message', icon: MessageSquare },
  { key: 'memory', label: 'Memory', icon: Database },
  { key: 'tool', label: 'Tool', icon: Wrench },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const TAB_COMPONENTS: Record<TabKey, React.LazyExoticComponent<React.FC<any>>> = {
  llm: LLMProvidersPage,
  message: MessageProvidersPage,
  memory: MemoryProvidersPage,
  tool: ToolProvidersPage,
};

const isValidTab = (value: string | null): value is TabKey =>
  value !== null && TABS.some((t) => t.key === value);

const ProvidersManagementPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: TabKey = isValidTab(rawTab) ? rawTab : 'llm';

  const setTab = useCallback(
    (tab: TabKey) => {
      setSearchParams(tab === 'llm' ? {} : { tab }, { replace: true });
    },
    [setSearchParams],
  );

  const breadcrumbItems = useMemo(
    () => [{ label: 'Providers', href: '/admin/providers', isActive: true }],
    [],
  );

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 mb-6">
        <h1 className="text-3xl font-bold">Providers</h1>
        <p className="text-base-content/70 mt-1">
          Configure and manage your LLM, messaging, memory, and tool providers
        </p>
      </div>

      {/* DaisyUI Tabs */}
      <div role="tablist" className="tabs tabs-bordered mb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            className={`tab gap-2 ${activeTab === key ? 'tab-active font-semibold' : ''}`}
            onClick={() => setTab(key)}
            aria-selected={activeTab === key}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <Suspense
        fallback={
          <div className="flex justify-center items-center min-h-[40vh]">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <ActiveComponent />
      </Suspense>
    </div>
  );
};

export default ProvidersManagementPage;
