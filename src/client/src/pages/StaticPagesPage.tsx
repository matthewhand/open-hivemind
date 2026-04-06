import React from 'react';
import Card from '../components/DaisyUI/Card';
import Button from '../components/DaisyUI/Button';
import PageHeader from '../components/DaisyUI/PageHeader';
import { Alert } from '../components/DaisyUI/Alert';
import {
  ExternalLink as ExternalLinkIcon,
  Home as HomeIcon,
  Clock as ClockIcon,
  Monitor as MonitorIcon,
  FileText,
  ArrowUpRight,
  TriangleAlert,
} from 'lucide-react';

interface StaticPage {
  title: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  colorClass: string;
  bgClass: string;
}

const STATIC_PAGES: StaticPage[] = [
  {
    title: 'Enhanced Homepage',
    description: 'Beautiful landing page with enhanced UI and animations.',
    icon: <HomeIcon className="w-8 h-8" />,
    url: '/enhanced-homepage.html',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
  },
  {
    title: 'Loading Page',
    description: 'Elegant loading screen with progress indicators.',
    icon: <ClockIcon className="w-8 h-8" />,
    url: '/loading.html',
    colorClass: 'text-secondary',
    bgClass: 'bg-secondary/10',
  },
  {
    title: 'Screensaver',
    description: 'Interactive screensaver display for idle states.',
    icon: <MonitorIcon className="w-8 h-8" />,
    url: '/screensaver.html',
    colorClass: 'text-info',
    bgClass: 'bg-info/10',
  },
];

const StaticPagesPage: React.FC = () => {
  const handleOpenPage = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Static Pages"
        description="Browse and access static HTML pages and resources."
        icon={FileText}
        gradient="primary"
      />

      {/* Info Banner */}
      <Alert status="info">
        <TriangleAlert className="w-5 h-5 shrink-0" />
        <span>These static HTML pages are served directly from the public directory and do not require application authentication.</span>
      </Alert>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {STATIC_PAGES.map((page) => (
          <Card key={page.url}>
            <div className="flex flex-col items-center text-center p-4">
              <div className={`p-4 rounded-xl ${page.bgClass} ${page.colorClass} mb-4`}>
                {page.icon}
              </div>
              <h3 className="font-semibold text-lg mb-1">{page.title}</h3>
              <p className="text-sm text-base-content/70 mb-2">{page.description}</p>
              <code className="text-xs text-base-content/50 bg-base-200 px-2 py-1 rounded mb-4">
                {page.url}
              </code>
            </div>
            <Card.Actions className="justify-center pb-4">
              <Button variant="ghost" size="sm" onClick={() => handleOpenPage(page.url)}>
                Open Page <ExternalLinkIcon className="w-4 h-4 ml-1" />
              </Button>
            </Card.Actions>
          </Card>
        ))}
      </div>

      {/* About Section */}
      <Card>
        <Card.Title tag="h3">About Static Pages</Card.Title>
        <p className="text-sm text-base-content/70 mb-3">
          These static HTML pages are served directly from the <code className="text-xs bg-base-200 px-1.5 py-0.5 rounded">public/</code> directory. They can be used for:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-base-content/70">
          <li>Landing pages and marketing content</li>
          <li>Loading screens during application startup</li>
          <li>Screensavers for kiosk or display modes</li>
          <li>Offline fallback pages</li>
        </ul>
      </Card>

      {/* Quick Links */}
      <Card>
        <Card.Title tag="h3">Quick Links</Card.Title>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STATIC_PAGES.map((page) => (
            <button
              key={page.url}
              type="button"
              className={`flex items-center gap-3 p-3 rounded-lg border border-base-300 bg-base-100 hover:border-primary hover:bg-primary/5 transition-all text-left group`}
              onClick={() => handleOpenPage(page.url)}
            >
              <div className={`p-2 rounded-lg ${page.bgClass} ${page.colorClass} group-hover:scale-110 transition-transform`}>
                {page.icon}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{page.title}</div>
                <div className="text-xs text-base-content/50 truncate">{page.url}</div>
              </div>
              <ArrowUpRight className="w-4 h-4 ml-auto text-base-content/30 group-hover:text-primary transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default StaticPagesPage;
