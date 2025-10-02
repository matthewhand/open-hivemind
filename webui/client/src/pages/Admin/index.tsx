import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  People as PeopleIcon,
  Build as BuildIcon,
  Edit as EditIcon,
  Monitor as MonitorIcon,
} from '@mui/icons-material';
import { 
  Hero,
  Tabs,
  StatsCards,
  Card,
  Button,
  Grid,
  Badge,
  Alert,
  Avatar,
  DataTable,
  Modal,
  Timeline,
  ProgressBar
} from '../../components/DaisyUI';
import BotManager from '../../components/BotManager';
import PersonaManager from '../../components/PersonaManager';
import MCPServerManager from '../../components/MCPServerManager';
import ConfigurationEditor from '../../components/ConfigurationEditor';
import ActivityMonitor from '../../components/ActivityMonitor';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <div className="py-8">{children}</div>}
    </div>
  );
}

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedBot, setSelectedBot] = useState<any>(undefined);

  const handleTabChange = (event: React.MouseEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleBotSelect = (bot: any) => {
    setSelectedBot(bot);
    // Switch to configuration tab when a bot is selected
    setActiveTab(3);
  };

  const adminStats = [
    { title: 'Active Bots', value: '3', icon: '🤖', trend: '+2 this week' },
    { title: 'Total Users', value: '127', icon: '👥', trend: '+15 this month' },
    { title: 'Messages Today', value: '1,247', icon: '💬', trend: '+23% vs yesterday' },
    { title: 'System Health', value: '98%', icon: '❤️', trend: 'All systems green' }
  ];

  const systemAlerts = [
    { type: 'warning', message: 'Bot #2 offline for maintenance', time: '5m ago' },
    { type: 'success', message: 'MCP server connection restored', time: '15m ago' },
    { type: 'info', message: 'Weekly backup completed', time: '1h ago' }
  ];

  const tabs = [
    {
      label: 'Overview',
      icon: <SettingsIcon />,
      component: (
        <div className="space-y-8">
          {/* Welcome Hero */}
          <Hero
            title="Admin Control Center"
            subtitle="Comprehensive system administration and management dashboard"
            variant="normal"
            bgColor="bg-gradient-to-r from-info/20 to-success/20"
            alignment="center"
            minHeight="sm"
            actions={
              <div className="flex gap-4">
                <Button variant="primary" size="lg">
                  Quick Setup
                </Button>
                <Button variant="outline" size="lg">
                  Documentation
                </Button>
              </div>
            }
          />

          {/* System Statistics */}
          <Grid cols={1} mdCols={2} lgCols={4} gap={6}>
            {adminStats.map((stat, index) => (
              <Card key={index} className="bg-gradient-to-br from-base-100 to-base-200 shadow-lg">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl">{stat.icon}</div>
                    <Badge variant="success" size="sm">Live</Badge>
                  </div>
                  <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                  <div className="text-sm font-medium text-base-content mb-1">{stat.title}</div>
                  <div className="text-xs text-base-content/60">{stat.trend}</div>
                </div>
              </Card>
            ))}
          </Grid>

          {/* Alerts & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="System Alerts" className="h-full">
              <div className="space-y-4">
                {systemAlerts.map((alert, index) => (
                  <Alert 
                    key={index}
                    status={alert.type as any}
                    className="flex items-center justify-between"
                  >
                    <span>{alert.message}</span>
                    <span className="text-xs opacity-60">{alert.time}</span>
                  </Alert>
                ))}
              </div>
              <div className="mt-4">
                <Button variant="outline" size="sm" fullWidth>
                  View All Alerts
                </Button>
              </div>
            </Card>

            <Card title="Quick Actions" className="h-full">
              <Grid cols={2} gap={4}>
                <Button 
                  variant="primary" 
                  size="lg" 
                  fullWidth
                  onClick={() => setActiveTab(1)}
                >
                  🤖 Add Bot
                </Button>
                <Button 
                  variant="secondary" 
                  size="lg" 
                  fullWidth
                  onClick={() => setActiveTab(2)}
                >
                  🎭 New Persona
                </Button>
                <Button 
                  variant="accent" 
                  size="lg" 
                  fullWidth
                  onClick={() => setActiveTab(3)}
                >
                  🔗 Connect MCP
                </Button>
                <Button 
                  variant="info" 
                  size="lg" 
                  fullWidth
                  onClick={() => setActiveTab(5)}
                >
                  📊 View Activity
                </Button>
              </Grid>
              
              <div className="mt-6 p-4 bg-base-200 rounded-lg">
                <h4 className="font-semibold mb-2">System Health</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">CPU Usage</span>
                    <span className="text-sm font-mono">34%</span>
                  </div>
                  <ProgressBar value={34} variant="success" size="sm" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Memory</span>
                    <span className="text-sm font-mono">67%</span>
                  </div>
                  <ProgressBar value={67} variant="warning" size="sm" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Storage</span>
                    <span className="text-sm font-mono">23%</span>
                  </div>
                  <ProgressBar value={23} variant="info" size="sm" />
                </div>
              </div>
            </Card>
          </div>

          {/* Management Overview Cards */}
          <Grid cols={1} mdCols={2} lgCols={3} gap={6}>
            <Card 
              title="Bot Management" 
              className="hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => setActiveTab(1)}
            >
              <div className="p-6">
                <div className="text-4xl mb-4">🤖</div>
                <p className="text-base-content/70 mb-4">
                  Create, configure, and manage your bot instances. Monitor their status and performance.
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="primary">3 Active</Badge>
                  <Button variant="ghost" size="sm">Manage →</Button>
                </div>
              </div>
            </Card>

            <Card 
              title="Persona Management" 
              className="hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => setActiveTab(2)}
            >
              <div className="p-6">
                <div className="text-4xl mb-4">🎭</div>
                <p className="text-base-content/70 mb-4">
                  Create and manage AI personas that define your bots' behavior and personality.
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">5 Personas</Badge>
                  <Button variant="ghost" size="sm">Manage →</Button>
                </div>
              </div>
            </Card>

            <Card 
              title="MCP Servers" 
              className="hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => setActiveTab(3)}
            >
              <div className="p-6">
                <div className="text-4xl mb-4">🔗</div>
                <p className="text-base-content/70 mb-4">
                  Connect and manage Model Context Protocol servers to extend your bots' capabilities.
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="accent">2 Connected</Badge>
                  <Button variant="ghost" size="sm">Manage →</Button>
                </div>
              </div>
            </Card>
          </Grid>
        </div>
      ),
    },
    {
      label: 'Bots',
      icon: <PeopleIcon />,
      component: <BotManager onBotSelect={handleBotSelect} />,
    },
    {
      label: 'Personas',
      icon: <PeopleIcon />,
      component: <PersonaManager />,
    },
    {
      label: 'MCP Servers',
      icon: <BuildIcon />,
      component: <MCPServerManager />,
    },
    {
      label: 'Configuration',
      icon: <EditIcon />,
      component: <ConfigurationEditor bot={selectedBot} onSave={setSelectedBot} />,
    },
    {
      label: 'Activity',
      icon: <MonitorIcon />,
      component: <ActivityMonitor />,
    },
  ];

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <div className="my-8 mb-16">
        <h1 className="text-4xl font-bold mb-4">
          Admin Dashboard
        </h1>
        <p className="text-lg text-base-content/70 mb-8">
          Administrative controls and system management for your Discord LLM bot
        </p>

        <div className="card bg-base-100 shadow-xl w-full">
          <div className="tabs tabs-boxed w-full">
            {tabs.map((tab, index) => (
              <a
                key={index}
                className={`tab tab-lg ${activeTab === index ? 'tab-active' : ''}`}
                onClick={(e) => handleTabChange(e, index)}
                id={`admin-tab-${index}`}
                aria-controls={`admin-tabpanel-${index}`}
              >
                {tab.icon && <span className="mr-2">{tab.icon}</span>}
                {tab.label}
              </a>
            ))}
          </div>

          {tabs.map((tab, index) => (
            <TabPanel key={index} value={activeTab} index={index}>
              {tab.component}
            </TabPanel>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
