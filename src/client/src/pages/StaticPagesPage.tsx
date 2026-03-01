/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from 'react';
import { Card, Button, Breadcrumbs } from '../components/DaisyUI';
import { ArrowTopRightOnSquareIcon, HomeIcon, ClockIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

const StaticPagesPage: React.FC = () => {
  const breadcrumbItems = [{ label: 'Static Pages', href: '/static', isActive: true }];

  const staticPages = [
    {
      title: 'Enhanced Homepage',
      description: 'Beautiful landing page with enhanced UI and animations',
      icon: <HomeIcon className="w-10 h-10" />,
      url: '/enhanced-homepage.html',
      color: 'primary',
    },
    {
      title: 'Loading Page',
      description: 'Elegant loading screen with progress indicators',
      icon: <ClockIcon className="w-10 h-10" />,
      url: '/loading.html',
      color: 'secondary',
    },
    {
      title: 'Screensaver',
      description: 'Interactive screensaver display for idle states',
      icon: <ComputerDesktopIcon className="w-10 h-10" />,
      url: '/screensaver.html',
      color: 'info',
    },
  ];

  const handleOpenPage = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 mb-8">
        <h1 className="text-3xl font-bold mb-2">Static Pages</h1>
        <p className="text-base-content/70">Browse and access static HTML pages and resources</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {staticPages.map((page) => (
          <Card key={page.url} className="flex flex-col h-full">
            <div className="flex-grow text-center p-6">
              <div className={`text-${page.color} mb-4 flex justify-center`}>
                {page.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{page.title}</h3>
              <p className="text-sm text-base-content/70 mb-3">{page.description}</p>
              <p className="text-sm font-mono text-base-content/60 mt-4">{page.url}</p>
            </div>
            <div className="flex justify-center pb-4">
              <Button
                variant={page.color as any}
                onClick={() => handleOpenPage(page.url)}
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />
                Open Page
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-8 bg-base-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-3">About Static Pages</h2>
          <p className="text-sm text-base-content/70 mb-3">
            These static HTML pages are served directly from the public directory and can be used for:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Landing pages and marketing content</li>
            <li>Loading screens during application startup</li>
            <li>Screensavers for kiosk or display modes</li>
            <li>Offline fallback pages</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default StaticPagesPage;