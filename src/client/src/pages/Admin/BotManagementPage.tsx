import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Alert,
  Breadcrumbs,
  Link,
  Button
} from '@mui/material';
import {
  TableView as TableIcon,
  ViewModule as CardIcon,
  AdminPanelSettings as AdminIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import EnhancedBotManager from '../../components/Admin/EnhancedBotManager';
import ReactAdminBotManager from '../../components/Admin/ReactAdminBotManager';

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
      id={`bot-management-tabpanel-${index}`}
      aria-labelledby={`bot-management-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const BotManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedBot, setSelectedBot] = useState<any>(null);
  const navigate = useNavigate();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleBotSelect = (bot: any) => {
    setSelectedBot(bot);
    // Could navigate to bot details page or open modal
    console.log('Selected bot:', bot);
  };

  const tabs = [
    {
      label: 'Card View',
      icon: <CardIcon />,
      description: 'Visual card-based bot management with status indicators',
      component: <EnhancedBotManager onBotSelect={handleBotSelect} />
    },
    {
      label: 'Table View',
      icon: <TableIcon />,
      description: 'React-Admin powered data grid with advanced CRUD operations',
      component: <ReactAdminBotManager />
    }
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 2, mb: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate('/admin')}
            sx={{ cursor: 'pointer' }}
          >
            Admin Dashboard
          </Link>
          <Typography color="text.primary">Bot Management</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Bot Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create, configure, and manage your AI bot instances with persistent storage
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => navigate('/admin')}
          >
            Back to Dashboard
          </Button>
        </Box>

        {/* Info Alert */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Enhanced Bot Management:</strong> This interface provides two views for managing your bots. 
            The Card View offers a visual approach with status indicators, while the Table View provides 
            advanced data grid capabilities powered by React-Admin with full CRUD operations and persistent storage.
          </Typography>
        </Alert>

        {/* Selected Bot Info */}
        {selectedBot && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Selected Bot:</strong> {selectedBot.name} 
              ({selectedBot.messageProvider} → {selectedBot.llmProvider})
            </Typography>
          </Alert>
        )}

        {/* Tabs */}
        <Paper sx={{ width: '100%' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="bot management view tabs"
            variant="fullWidth"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: 80,
                textTransform: 'none'
              }
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {tab.icon}
                      <Typography variant="subtitle1">{tab.label}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                      {tab.description}
                    </Typography>
                  </Box>
                }
                id={`bot-management-tab-${index}`}
                aria-controls={`bot-management-tabpanel-${index}`}
              />
            ))}
          </Tabs>

          {/* Tab Panels */}
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

export default BotManagementPage;