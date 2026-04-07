/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/DaisyUI/PageHeader';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import { Code } from 'lucide-react';

const SpecsPage = lazy(() => import('./SpecsPage'));
const SitemapPage = lazy(() => import('./SitemapPage'));
const DaisyUIShowcase = lazy(() => import('./DaisyUIShowcase'));
const StaticPagesPage = lazy(() => import('./StaticPagesPage'));

const TABS = [
  { key: 'specs', label: 'Specs' },
  { key: 'sitemap', label: 'Sitemap' },
  { key: 'showcase', label: 'UI Components' },
  { key: 'static-pages', label: 'Static Pages' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const TabContent: React.FC<{ tab: TabKey }> = ({ tab }) => {
  switch (tab) {
    case 'specs':
      return <SpecsPage />;
    case 'sitemap':
      return <SitemapPage />;
    case 'showcase':
      return <DaisyUIShowcase />;
    case 'static-pages':
      return <StaticPagesPage />;
    default:
      return null;
  }
};

const DeveloperPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabKey) || 'specs';

  const handleTabChange = (tab: TabKey) => {
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Developer"
        subtitle="Developer tools, specs, and reference pages"
        icon={<Code className="w-6 h-6" />}
      />

      <div role="tablist" className="tabs tabs-bordered">
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

      <Suspense
        fallback={
          <div className="flex justify-center items-center min-h-[40vh]">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <TabContent tab={activeTab} />
      </Suspense>
    </div>
  );
};

export default DeveloperPage;
