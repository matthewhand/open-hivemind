import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Tabs,
  Tab,
  Paper,
  Alert,
  Card,
  CardContent,
  Grid,
  Badge,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  People as PeopleIcon,
  Build as BuildIcon,
  Monitor as MonitorIcon,
  SmartToy as BotIcon,
  Person as PersonaIcon,
  Link as LinkIcon,
  Assessment as ActivityIcon,
  Dns as ServerIcon,
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
  const [hasServerUnsavedChanges, setHasServerUnsavedChanges] = useState(false);
  const [activityUnseenCount, setActivityUnseenCount] = useState(0);

  const SERVER_TAB_INDEX = 4;
  const ACTIVITY_TAB_INDEX = 5;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (activeTab === SERVER_TAB_INDEX && newValue !== SERVER_TAB_INDEX && hasServerUnsavedChanges) {
      const confirmLeave = window.confirm('You have unsaved server configuration changes. Leave without saving?');
      if (!confirmLeave) {
        return;
      }
    }

    if (newValue === ACTIVITY_TAB_INDEX) {
      setActivityUnseenCount(0);
    }

    setActiveTab(newValue);
  };

  const handleBotSelect = (_bot: unknown) => {
    // Switch to configuration tab when a bot is selected
    setActiveTab(SERVER_TAB_INDEX);
  };

  useEffect(() => {
    if (!hasServerUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasServerUnsavedChanges]);

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

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                  color: 'white',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) => theme.shadows[8],
                  },
                  transition: 'all 0.3s ease-in-out',
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <BotIcon sx={{ fontSize: 48, mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Bot Management
                  </Typography>
                  <Typography variant="body2">
                    Create, configure, and manage your bot instances. Monitor their status and performance.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                  color: 'white',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) => theme.shadows[8],
                  },
                  transition: 'all 0.3s ease-in-out',
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <PersonaIcon sx={{ fontSize: 48, mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Persona Management
                  </Typography>
                  <Typography variant="body2">
                    Create and manage AI personas that define your bots' behavior and personality.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
                  color: 'white',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) => theme.shadows[8],
                  },
                  transition: 'all 0.3s ease-in-out',
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <LinkIcon sx={{ fontSize: 48, mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    MCP Servers
                  </Typography>
                  <Typography variant="body2">
                    Connect and manage Model Context Protocol servers to extend your bots' capabilities.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)',
                  color: 'white',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) => theme.shadows[8],
                  },
                  transition: 'all 0.3s ease-in-out',
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <ActivityIcon sx={{ fontSize: 48, mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Activity Monitoring
                  </Typography>
                  <Typography variant="body2">
                    Monitor bot activity, response times, and system performance in real-time.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
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
      label: 'Server',
      icon: <ServerIcon />,
      component: <ConfigurationEditor onDirtyChange={setHasServerUnsavedChanges} />,
    },
    {
      label: 'Activity',
      icon: (
        <Badge
          color="error"
          badgeContent={activityUnseenCount > 99 ? '99+' : activityUnseenCount}
          invisible={activityUnseenCount === 0}
        >
          <MonitorIcon />
        </Badge>
      ),
      component: (
        <ActivityMonitor
          isActive={activeTab === ACTIVITY_TAB_INDEX}
          onUnseenActivityChange={setActivityUnseenCount}
        />
      ),
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
