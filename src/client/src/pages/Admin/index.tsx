/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import EnhancedBotManager from '../../components/Admin/EnhancedBotManager';
import PersonaManager from '../../components/PersonaManager';
import MCPServerManager from '../../components/MCPServerManager';
import ComprehensiveConfigPanel from '../../components/ComprehensiveConfigPanel';
import ActivityMonitor from '../../components/ActivityMonitor';
import {
  HomeIcon,
  UsersIcon,
  CommandLineIcon,
  CpuChipIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedBot, setSelectedBot] = useState<unknown>(null);

  const handleBotSelect = (bot: unknown) => {
    setSelectedBot(bot);
    // Switch to configuration tab when a bot is selected
    setActiveTab(4);
  };

  const tabs = [
    {
      label: 'Overview',
      icon: HomeIcon,
      component: (
        <div className="space-y-6">
          <div className="alert alert-info shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
              <h3 className="font-bold">Welcome to the Admin Dashboard</h3>
              <div className="text-xs">Use the tabs above to manage different aspects of your bot system.</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Bot Management</h2>
                <p>Create, configure, and manage your bot instances. Monitor their status and performance.</p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Persona Management</h2>
                <p>Create and manage AI personas that define your bots' behavior and personality.</p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">MCP Servers</h2>
                <p>Connect and manage Model Context Protocol servers to extend your bots' capabilities.</p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Activity Monitoring</h2>
                <p>Monitor bot activity, response times, and system performance in real-time.</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Bots',
      icon: UsersIcon,
      component: <EnhancedBotManager onBotSelect={handleBotSelect} />,
    },
    {
      label: 'Personas',
      icon: UsersIcon,
      component: <PersonaManager />,
    },
    {
      label: 'MCP Servers',
      icon: CommandLineIcon,
      component: <MCPServerManager />,
    },
    {
      label: 'Configuration',
      icon: Cog6ToothIcon,
      component: <ComprehensiveConfigPanel />,
    },
    {
      label: 'Activity',
      icon: ChartBarIcon,
      component: <ActivityMonitor />,
    },
  ];

  const ActiveComponent = tabs[activeTab].component;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-base-content/70">
          Administrative controls and system management for your Discord LLM bot
        </p>
      </div>

      <div className="w-full">
        <div role="tablist" className="tabs tabs-boxed mb-6 bg-base-200 p-2 rounded-lg overflow-x-auto flex-nowrap">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            return (
              <a
                key={index}
                role="tab"
                className={`tab h-10 gap-2 whitespace-nowrap ${activeTab === index ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(index)}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </a>
            );
          })}
        </div>

        <div className="bg-base-100 rounded-box min-h-[500px]">
          {/* We render the component directly instead of using a wrapper to avoid unnecessary re-renders */}
          {typeof ActiveComponent === 'object' ? ActiveComponent : <ActiveComponent />}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
