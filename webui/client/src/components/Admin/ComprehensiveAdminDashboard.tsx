import React, { useState } from 'react';
import {
  Dashboard as DashboardIcon,
  SmartToy as AgentIcon,
  Extension as MCPIcon,
  Timeline as ActivityIcon,
  Person as PersonaIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';

import EnhancedAgentConfigurator from './EnhancedAgentConfigurator';
import MCPServerManager from './MCPServerManager';
import ActivityMonitor from './ActivityMonitor';
import PersonaManager from './PersonaManager';
import EnvMonitor from './EnvMonitor';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <div className="py-3">
          {children}
        </div>
      )}
    </div>
  );
}

const ComprehensiveAdminDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* AppBar equivalent with Tailwind */}
      <header className="bg-primary text-primary-content shadow-md mb-3">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-lg font-semibold flex-1">Hivemind Admin Dashboard</h1>
            {/* Tooltip equivalent with DaisyUI or Tailwind */}
            <div className="tooltip tooltip-bottom" data-tip="Notifications">
              <button className="btn btn-ghost btn-circle">
                <span className="indicator">
                  <NotificationsIcon />
                  <span className="badge badge-xs badge-error indicator-item">0</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-screen-xl flex-1">
        {/* Tabs using DaisyUI */}
        <div className="mb-3 border-b border-gray-300">
          <div className="tabs tabs-boxed">
            <button
              className={`tab tab-lg ${currentTab === 0 ? 'tab-active' : ''}`}
              onClick={(e) => handleTabChange(e, 0)}
              id="admin-tab-0"
              aria-controls="admin-tabpanel-0"
            >
              <DashboardIcon className="w-5 h-5 mr-2" /> Overview
            </button>
            <button
              className={`tab tab-lg ${currentTab === 1 ? 'tab-active' : ''}`}
              onClick={(e) => handleTabChange(e, 1)}
              id="admin-tab-1"
              aria-controls="admin-tabpanel-1"
            >
              <AgentIcon className="w-5 h-5 mr-2" /> Agents
            </button>
            <button
              className={`tab tab-lg ${currentTab === 2 ? 'tab-active' : ''}`}
              onClick={(e) => handleTabChange(e, 2)}
              id="admin-tab-2"
              aria-controls="admin-tabpanel-2"
            >
              <MCPIcon className="w-5 h-5 mr-2" /> MCP Servers
            </button>
            <button
              className={`tab tab-lg ${currentTab === 3 ? 'tab-active' : ''}`}
              onClick={(e) => handleTabChange(e, 3)}
              id="admin-tab-3"
              aria-controls="admin-tabpanel-3"
            >
              <PersonaIcon className="w-5 h-5 mr-2" /> Personas
            </button>
            <button
              className={`tab tab-lg ${currentTab === 4 ? 'tab-active' : ''}`}
              onClick={(e) => handleTabChange(e, 4)}
              id="admin-tab-4"
              aria-controls="admin-tabpanel-4"
            >
              <ActivityIcon className="w-5 h-5 mr-2" /> Activity
            </button>
            <button
              className={`tab tab-lg ${currentTab === 5 ? 'tab-active' : ''}`}
              onClick={(e) => handleTabChange(e, 5)}
              id="admin-tab-5"
              aria-controls="admin-tabpanel-5"
            >
              <SettingsIcon className="w-5 h-5 mr-2" /> Environment
            </button>
          </div>
        </div>

        <TabPanel value={currentTab} index={0}>
          <h2 className="text-2xl font-bold mb-4">System Overview</h2>
          <p className="text-base">
            Welcome to the Hivemind Admin Dashboard. Use the tabs above to manage agents,
            MCP servers, personas, and monitor system activity.
          </p>
          {/* Future: Add dashboard cards with system stats */}
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <EnhancedAgentConfigurator />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <MCPServerManager />
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <PersonaManager />
        </TabPanel>

        <TabPanel value={currentTab} index={4}>
          <ActivityMonitor />
        </TabPanel>

        <TabPanel value={currentTab} index={5}>
          <EnvMonitor />
        </TabPanel>
      </main>
    </div>
  );
};

export default ComprehensiveAdminDashboard;