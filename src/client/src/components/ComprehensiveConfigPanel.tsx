import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import LLMProvidersConfig from './LLMProvidersConfig';
import MessengerProvidersConfig from './MessengerProvidersConfig';
import PersonaManager from './PersonaManager';
import MCPServerManager from './Admin/MCPServerManager';
import ToolUsageGuardsConfig from './ToolUsageGuardsConfig';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';
import PersonIcon from '@mui/icons-material/Person';
import BuildIcon from '@mui/icons-material/Build';
import SecurityIcon from '@mui/icons-material/Security';

const ComprehensiveConfigPanel: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Tabs value={currentTab} onChange={handleChange} aria-label="configuration panel tabs">
        <Tab icon={<SettingsIcon />} label="LLM Providers" />
        <Tab icon={<ChatIcon />} label="Messenger Providers" />
        <Tab icon={<PersonIcon />} label="Personas" />
        <Tab icon={<BuildIcon />} label="MCP Server Management" />
        <Tab icon={<SecurityIcon />} label="Tool Usage Guards" />
      </Tabs>
      {currentTab === 0 && <LLMProvidersConfig />}
      {currentTab === 1 && <MessengerProvidersConfig />}
      {currentTab === 2 && <PersonaManager />}
      {currentTab === 3 && <MCPServerManager />}
      {currentTab === 4 && <ToolUsageGuardsConfig />}
    </Box>
  );
};

export default ComprehensiveConfigPanel;