import React from 'react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface DashboardTabsProps {
  tabs: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  const [selected, setSelected] = React.useState(activeTab ?? tabs[0]?.id ?? '');

  const handleSelect = (id: string) => {
    setSelected(id);
    onTabChange?.(id);
  };

  const current = tabs.find((t) => t.id === selected);

  return (
    <div>
      <div role="tablist" className="tabs tabs-bordered mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={selected === tab.id}
            className={`tab${selected === tab.id ? ' tab-active' : ''}`}
            onClick={() => handleSelect(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{current?.content}</div>
    </div>
  );
};
