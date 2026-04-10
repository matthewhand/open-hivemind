/**
 * Tabs Component - DaisyUI tabbed interface
 */

import React, { useState } from 'react';

interface Tab {
  /** Tab identifier — `id` is canonical; `key` is accepted as an alias for backward compatibility */
  id?: string;
  key?: string;
  label: string;
  content?: React.ReactNode;
  disabled?: boolean;
  /** Optional color for the tab (e.g. 'error' for dangerous, 'success' for recommended) */
  color?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
  badge?: string | number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  /** Controlled active tab id */
  activeTab?: string;
  /** Callback when active tab changes (controlled mode) */
  onChange?: (tabId: string) => void;
  variant?: 'default' | 'bordered' | 'lifted' | 'boxed';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  onTabChange?: (tabId: string) => void;
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab,
  activeTab: controlledActiveTab,
  onChange,
  variant = 'default',
  size = 'md',
  className = '',
  onTabChange
}) => {
  const getTabId = (tab: Tab) => tab.id ?? tab.key ?? '';
  const isControlled = controlledActiveTab !== undefined;
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab || getTabId(tabs[0]));
  const activeTab = isControlled ? controlledActiveTab : internalActiveTab;

  const handleTabClick = (tabId: string) => {
    if (tabs.find(tab => getTabId(tab) === tabId)?.disabled) return;
    if (!isControlled) setInternalActiveTab(tabId);
    onChange?.(tabId);
    onTabChange?.(tabId);
  };

  const getTabsClasses = () => {
    const variantClasses = {
      default: '',
      bordered: 'tabs-bordered',
      lifted: 'tabs-lifted',
      boxed: 'tabs-boxed'
    };

    const sizeClasses = {
      xs: 'tabs-xs',
      sm: 'tabs-sm',
      md: '',
      lg: 'tabs-lg'
    };

    return `tabs ${variantClasses[variant]} ${sizeClasses[size]}`;
  };

  const activeTabContent = tabs.find(tab => getTabId(tab) === activeTab)?.content;

  return (
    <div className={className}>
      <div className={getTabsClasses()}>
        {tabs.map((tab) => (
          <button
            key={getTabId(tab)}
            className={`tab ${activeTab === getTabId(tab) ? 'tab-active' : ''} ${tab.disabled ? 'tab-disabled' : ''}`}
            onClick={() => handleTabClick(getTabId(tab))}
            disabled={tab.disabled}
          >
            <div className="flex items-center gap-2">
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="badge badge-sm badge-primary">
                  {tab.badge}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      
      {variant === 'lifted' && (
        <div className="tab-content bg-base-100 border-base-300 rounded-box p-6">
          {activeTabContent}
        </div>
      )}
      
      {variant !== 'lifted' && (
        <div className="tab-content p-4">
          {activeTabContent}
        </div>
      )}
    </div>
  );
};

export default Tabs;