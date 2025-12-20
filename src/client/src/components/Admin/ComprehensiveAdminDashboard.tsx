import React, { useState } from 'react';
import {
  Squares2X2Icon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  BellIcon,
  CommandLineIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

import EnhancedAgentConfigurator from './EnhancedAgentConfigurator';
import MCPServerManager from '../MCPServerManager';
import ActivityMonitor from './ActivityMonitor';
import PersonaManager from './PersonaManager';
import EnvMonitor from './EnvMonitor';
import LlmProfileManager from './LlmProfileManager';
import TemplateManager from './TemplateManager';
import GlobalConfigurationManager from './GlobalConfigurationManager';
import BotListManager from './BotListManager';
import MCPProfileManager from './MCPProfileManager';

const ComprehensiveAdminDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const tabs = [
    { label: 'Overview', icon: Squares2X2Icon },
    { label: 'Bot Status', icon: CpuChipIcon },
    { label: 'Agents', icon: CpuChipIcon },
    { label: 'LLM Profiles', icon: CommandLineIcon },
    { label: 'MCP Profiles', icon: WrenchScrewdriverIcon },
    { label: 'Templates', icon: DocumentDuplicateIcon },
    { label: 'General', icon: Cog6ToothIcon },
    { label: 'MCP Servers', icon: WrenchScrewdriverIcon },
    { label: 'Personas', icon: UserGroupIcon },
    { label: 'Activity', icon: ChartBarIcon },
    { label: 'Environment', icon: CommandLineIcon },
  ];

  return (
    <div className="min-h-screen bg-base-200">
      {/* Top Bar */}
      <div className="navbar bg-primary text-primary-content shadow-lg">
        <div className="flex-1">
          <h1 className="text-xl font-bold">Hivemind Admin Dashboard</h1>
        </div>
        <div className="flex-none">
          <button className="btn btn-ghost btn-circle">
            <div className="indicator">
              <BellIcon className="w-5 h-5" />
              <span className="badge badge-xs badge-error indicator-item">0</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Tabs */}
        <div role="tablist" className="tabs tabs-boxed mb-6 bg-base-100 p-2 overflow-x-auto">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            return (
              <a
                key={index}
                role="tab"
                className={`tab gap-2 ${currentTab === index ? 'tab-active' : ''}`}
                onClick={() => setCurrentTab(index)}
              >
                <Icon className="w-4 h-4" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </a>
            );
          })}
        </div>

        {/* Tab Panels */}
        <div className="bg-base-100 rounded-box p-6 min-h-[500px]">
          {currentTab === 0 && (
            <div>
              <h2 className="text-3xl font-bold mb-4">System Overview</h2>
              <p className="text-base-content/70 mb-6">
                Welcome to the Hivemind Admin Dashboard. Use the tabs above to manage agents,
                LLM profiles, templates, MCP servers, personas, and monitor system activity.
              </p>
              {/* Future: Add dashboard cards with system stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat bg-base-200 rounded-box">
                  <div className="stat-title">Total Agents</div>
                  <div className="stat-value">-</div>
                  <div className="stat-desc">Configure in Agents tab</div>
                </div>
                <div className="stat bg-base-200 rounded-box">
                  <div className="stat-title">MCP Servers</div>
                  <div className="stat-value">-</div>
                  <div className="stat-desc">Manage in MCP tab</div>
                </div>
                <div className="stat bg-base-200 rounded-box">
                  <div className="stat-title">Active Personas</div>
                  <div className="stat-value">-</div>
                  <div className="stat-desc">View in Personas tab</div>
                </div>
              </div>
            </div>
          )}
          {currentTab === 1 && <BotListManager />}
          {currentTab === 2 && <EnhancedAgentConfigurator />}
          {currentTab === 3 && <LlmProfileManager />}
          {currentTab === 4 && <MCPProfileManager />}
          {currentTab === 5 && <TemplateManager />}
          {currentTab === 6 && <GlobalConfigurationManager />}
          {currentTab === 7 && <MCPServerManager />}
          {currentTab === 8 && <PersonaManager />}
          {currentTab === 9 && <ActivityMonitor />}
          {currentTab === 10 && <EnvMonitor />}
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveAdminDashboard;