import React, { useState } from 'react';
import LLMProvidersConfig from './LLMProvidersConfig';
import MessengerProvidersConfig from './MessengerProvidersConfig';
import PersonaManager from './PersonaManager';
import MCPServerManager from './Admin/MCPServerManager';
import ToolUsageGuardsConfig from './ToolUsageGuardsConfig';
import {
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const ComprehensiveConfigPanel: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const tabs = [
    { label: 'LLM Providers', icon: Cog6ToothIcon, component: LLMProvidersConfig },
    { label: 'Messenger Providers', icon: ChatBubbleLeftRightIcon, component: MessengerProvidersConfig },
    { label: 'Personas', icon: UserGroupIcon, component: PersonaManager },
    { label: 'MCP Server Management', icon: WrenchScrewdriverIcon, component: MCPServerManager },
    { label: 'Tool Usage Guards', icon: ShieldCheckIcon, component: ToolUsageGuardsConfig },
  ];

  const ActiveComponent = tabs[currentTab].component;

  return (
    <div className="w-full">
      <div role="tablist" className="tabs tabs-boxed mb-6 bg-base-200 p-2 rounded-lg">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          return (
            <a
              key={index}
              role="tab"
              className={`tab h-10 gap-2 ${currentTab === index ? 'tab-active' : ''}`}
              onClick={() => setCurrentTab(index)}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </a>
          );
        })}
      </div>

      <div className="bg-base-100 rounded-box">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default ComprehensiveConfigPanel;