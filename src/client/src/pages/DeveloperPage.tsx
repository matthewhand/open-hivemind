import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../components/DaisyUI/Card';
import Tabs from '../components/DaisyUI/Tabs';
import { LoadingSpinner } from '../components/DaisyUI/Loading';

const SitemapPage = lazy(() => import('./SitemapPage'));
const DaisyUIShowcase = lazy(() => import('./DaisyUIShowcase'));
const StaticPagesPage = lazy(() => import('./StaticPagesPage'));
const SpecsPage = lazy(() => import('./SpecsPage'));

const TABS = [
  { key: 'sitemap', label: 'Sitemap' },
  { key: 'showcase', label: 'UI Components' },
  { key: 'specs', label: 'Specs' },
  { key: 'static-pages', label: 'Static Pages' },
];

const DeveloperPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'sitemap';

  const handleTabChange = (tab: string) => {
    setSearchParams(tab === 'sitemap' ? {} : { tab }, { replace: true });
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
            {activeTab === 'sitemap' && <SitemapPage />}
            {activeTab === 'showcase' && <DaisyUIShowcase />}
            {activeTab === 'specs' && <SpecsPage />}
            {activeTab === 'static-pages' && <StaticPagesPage />}
          </Suspense>
        </div>
      </Card>
    </div>
  );
};

export default DeveloperPage;
