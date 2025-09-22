import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Tooltip
} from '@mui/material';
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
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
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
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ mb: 3 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Hivemind Admin Dashboard
          </Typography>
          <Tooltip title="Notifications">
            <IconButton color="inherit">
              <Badge badgeContent={0} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl">
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange} 
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              icon={<DashboardIcon />} 
              label="Overview" 
              id="admin-tab-0"
              aria-controls="admin-tabpanel-0"
            />
            <Tab 
              icon={<AgentIcon />} 
              label="Agents" 
              id="admin-tab-1"
              aria-controls="admin-tabpanel-1"
            />
            <Tab 
              icon={<MCPIcon />} 
              label="MCP Servers" 
              id="admin-tab-2"
              aria-controls="admin-tabpanel-2"
            />
            <Tab 
              icon={<PersonaIcon />} 
              label="Personas" 
              id="admin-tab-3"
              aria-controls="admin-tabpanel-3"
            />
            <Tab 
              icon={<ActivityIcon />} 
              label="Activity" 
              id="admin-tab-4"
              aria-controls="admin-tabpanel-4"
            />
            <Tab 
              icon={<SettingsIcon />} 
              label="Environment" 
              id="admin-tab-5"
              aria-controls="admin-tabpanel-5"
            />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          <Typography variant="h4" gutterBottom>
            System Overview
          </Typography>
          <Typography variant="body1">
            Welcome to the Hivemind Admin Dashboard. Use the tabs above to manage agents, 
            MCP servers, personas, and monitor system activity.
          </Typography>
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
      </Container>
    </Box>
  );
};

export default ComprehensiveAdminDashboard;