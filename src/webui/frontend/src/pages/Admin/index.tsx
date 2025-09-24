import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Tabs,
  Tab,
  Paper,
  Alert,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  People as PeopleIcon,
  Build as BuildIcon,
  Edit as EditIcon,
  Monitor as MonitorIcon,
} from '@mui/icons-material';
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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedBot, setSelectedBot] = useState<unknown>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleBotSelect = (bot: unknown) => {
    setSelectedBot(bot);
    // Switch to configuration tab when a bot is selected
    setActiveTab(3);
  };

  const tabs = [
    {
      label: 'Overview',
      icon: <SettingsIcon />,
      component: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Admin Dashboard Overview
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            Welcome to the Admin Dashboard. Use the tabs above to manage different aspects of your bot system.
          </Alert>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Bot Management
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Create, configure, and manage your bot instances. Monitor their status and performance.
              </Typography>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Persona Management
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Create and manage AI personas that define your bots' behavior and personality.
              </Typography>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                MCP Servers
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Connect and manage Model Context Protocol servers to extend your bots' capabilities.
              </Typography>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Activity Monitoring
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Monitor bot activity, response times, and system performance in real-time.
              </Typography>
            </Paper>
          </Box>
        </Box>
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
    <Container maxWidth="xl">
      <Box sx={{ mt: 2, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Administrative controls and system management for your Discord LLM bot
        </Typography>

        <Paper sx={{ width: '100%' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="admin dashboard tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
                id={`admin-tab-${index}`}
                aria-controls={`admin-tabpanel-${index}`}
              />
            ))}
          </Tabs>

          {tabs.map((tab, index) => (
            <TabPanel key={index} value={activeTab} index={index}>
              {tab.component}
            </TabPanel>
          ))}
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminPage;
