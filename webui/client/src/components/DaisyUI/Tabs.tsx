import React, { useState } from 'react';

export interface Tab {
 id: string;
 title: string;
 content: React.ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  initialActiveTab?: string;
  className?: string;
  variant?: 'boxed' | 'bordered' | 'lifted' | 'none';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  initialActiveTab,
  className = '',
  variant = 'none',
  size = 'md',
}) => {
  const [activeTab, setActiveTab] = useState<string>(
    initialActiveTab || (tabs.length > 0 ? tabs[0].id : '')
  );

  // Determine DaisyUI classes based on props
  const variantClass = variant !== 'none' ? `tabs-${variant}` : '';
  const sizeClass = size !== 'md' ? `tab-${size}` : '';

  const tabsContainerClass = `tabs ${variantClass} ${className}`;
  const tabClass = `tab ${sizeClass}`;
  const activeTabClass = 'tab-active';

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <div className="tabs-container">
      <div 
        className={tabsContainerClass}
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${tabClass} ${activeTab === tab.id ? activeTabClass : ''}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.title}
          </button>
        ))}
      </div>
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="tab-content mt-4"
      >
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
};

export default Tabs;