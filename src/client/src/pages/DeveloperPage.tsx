import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/DaisyUI/Loading';

const SitemapPage = lazy(() => import('./SitemapPage'));
const DaisyUIShowcase = lazy(() => import('./DaisyUIShowcase'));
const StaticPagesPage = lazy(() => import('./StaticPagesPage'));

const TABS = [
  { key: 'sitemap', label: 'Sitemap' },
  { key: 'showcase', label: 'UI Components' },
  { key: 'static-pages', label: 'Static Pages' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const DeveloperPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (TABS.some(t => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'sitemap') as TabKey;

  const setTab = (tab: TabKey) => {
    setSearchParams(tab === 'sitemap' ? {} : { tab }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div role="tablist" className="tabs tabs-boxed bg-base-200 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            className={`tab ${activeTab === key ? 'tab-active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <Suspense fallback={<div className="flex justify-center items-center min-h-[200px]"><LoadingSpinner size="lg" /></div>}>
        {activeTab === 'sitemap' && <SitemapPage />}
        {activeTab === 'showcase' && <DaisyUIShowcase />}
        {activeTab === 'static-pages' && <StaticPagesPage />}
      </Suspense>
    </div>
  );
};

export default DeveloperPage;
