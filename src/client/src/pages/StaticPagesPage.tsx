/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { Card, Button, Breadcrumbs, ToastNotification } from '../components/DaisyUI';
import Modal from '../components/DaisyUI/Modal';
import {
  ArrowTopRightOnSquareIcon,
  HomeIcon,
  ClockIcon,
  ComputerDesktopIcon,
  EyeIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';

const StaticPagesPage: React.FC = () => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const breadcrumbItems = [{ label: 'Static Pages', href: '/uber/static', isActive: true }];

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

  const handleCopyLink = async (url: string) => {
    try {
      const fullUrl = `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      setToast({ message: 'Link copied to clipboard!', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: 'Failed to copy link', type: 'error' });
    }
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
          <Card key={page.url} className="flex flex-col h-full border border-base-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex-grow text-center p-6">
              <div className={`text-${page.color} mb-4 flex justify-center p-4 bg-base-200/50 rounded-full w-20 h-20 mx-auto items-center`}>
                {page.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{page.title}</h3>
              <p className="text-sm text-base-content/70 mb-3">{page.description}</p>
              <div className="badge badge-ghost font-mono text-xs mt-2">{page.url}</div>
            </div>
            <div className="p-4 bg-base-200/30 border-t border-base-200 flex justify-center gap-2">
              <div className="join w-full justify-center">
                <Button
                  className="join-item btn-sm flex-1"
                  variant="outline"
                  onClick={() => setPreviewUrl(page.url)}
                  title="Preview in modal"
                >
                  <EyeIcon className="w-4 h-4 mr-1" />
                  Preview
                </Button>
                <Button
                  className="join-item btn-sm flex-1"
                  variant="outline"
                  onClick={() => handleOpenPage(page.url)}
                  title="Open in new tab"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-1" />
                  Open
                </Button>
                <Button
                  className="join-item btn-sm"
                  variant="ghost"
                  onClick={() => handleCopyLink(page.url)}
                  title="Copy Link"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-8 bg-base-100 border border-base-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-3">About Static Pages</h2>
          <p className="text-sm text-base-content/70 mb-3">
            These static HTML pages are served directly from the public directory and can be used for:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80">
            <li>Landing pages and marketing content</li>
            <li>Loading screens during application startup</li>
            <li>Screensavers for kiosk or display modes</li>
            <li>Offline fallback pages</li>
          </ul>
        </div>
      </Card>

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        title="Page Preview"
        size="lg"
      >
        {previewUrl && (
          <div className="w-full h-[60vh] bg-base-200 rounded-lg overflow-hidden border border-base-300">
            <iframe
              src={previewUrl}
              className="w-full h-full"
              title="Page Preview"
            />
          </div>
        )}
        <div className="modal-action">
          <Button onClick={() => setPreviewUrl(null)}>Close</Button>
          {previewUrl && (
            <Button variant="primary" onClick={() => handleOpenPage(previewUrl)}>
              Open in New Tab
            </Button>
          )}
        </div>
      </Modal>

      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default StaticPagesPage;
