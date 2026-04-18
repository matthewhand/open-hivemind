/**
 * Shared layout wrapper for provider configuration pages.
 * Provides consistent header, error alert, and tabbed navigation.
 */
import React from 'react';
import type { TabItem } from './DaisyUI/Tabs';
import Tabs from './DaisyUI/Tabs';
import { Alert } from './DaisyUI/Alert';
import { XCircle as XIcon } from 'lucide-react';

interface TabbedProviderPageProps {
  title: string;
  description: string;
  error: string | null;
  onClearError: () => void;
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children?: React.ReactNode;
}

const TabbedProviderPage: React.FC<TabbedProviderPageProps> = ({
  title,
  description,
  error,
  onClearError,
  tabs,
  activeTab,
  onTabChange,
  children,
}) => (
  <div>
    <div className="px-6 pt-6 pb-2">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-base-content/60 text-sm mt-1">{description}</p>
    </div>
    <div className="px-6 pb-6">
      {error && (
        <div className="mb-6">
          <Alert status="error" icon={<XIcon />} message={error} onClose={onClearError} />
        </div>
      )}
      <Tabs variant="lifted" activeTab={activeTab} onChange={onTabChange} tabs={tabs} />
      {children}
    </div>
  </div>
);

export default TabbedProviderPage;
