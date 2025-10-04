import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Card, CardContent } from '@mui/material';
import { Breadcrumbs } from '../components/DaisyUI';
import SettingsGeneral from '../components/Settings/SettingsGeneral';
import SettingsSecurity from '../components/Settings/SettingsSecurity';
import SettingsIntegrations from '../components/Settings/SettingsIntegrations';

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const breadcrumbItems = [
    { label: 'Settings', href: '/uber/settings', isActive: true }
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs items={breadcrumbItems} />
      
      <Box sx={{ mt: 2, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure your Open-Hivemind instance settings and preferences
        </Typography>
      </Box>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="settings tabs">
            <Tab label="General" id="settings-tab-0" aria-controls="settings-tabpanel-0" />
            <Tab label="Security" id="settings-tab-1" aria-controls="settings-tabpanel-1" />
            <Tab label="Integrations" id="settings-tab-2" aria-controls="settings-tabpanel-2" />
          </Tabs>
        </Box>
        
        <TabPanel value={activeTab} index={0}>
          <SettingsGeneral />
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          <SettingsSecurity />
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          <SettingsIntegrations />
        </TabPanel>
      </Card>
    </Box>
  );
};

export default SystemSettings;