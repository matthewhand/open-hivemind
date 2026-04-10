/**
 * Tabs Component - DaisyUI tabbed interface
 */

import React, { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  /** Optional color for the tab (e.g. 'error' for dangerous, 'success' for recommended) */
  color?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
  badge?: string | number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  variant?: 'default' | 'bordered' | 'lifted' | 'boxed';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  onTabChange?: (tabId: string) => void;
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab,
  variant = 'default',
  size = 'md',
  className = '',
  onTabChange
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabClick = (tabId: string) => {
    if (tabs.find(tab => tab.id === tabId)?.disabled) return;
    setActiveTab(tabId);
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

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={className}>
      <div className={getTabsClasses()}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'tab-active' : ''} ${tab.disabled ? 'tab-disabled' : ''}`}
            onClick={() => handleTabClick(tab.id)}
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