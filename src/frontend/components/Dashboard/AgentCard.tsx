import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Switch,
  FormControlLabel,
  Tooltip,
  Alert
} from '@mui/material';
import { Agent } from '../../../services/agentService';
import { useProviders, type ProviderInfo } from '../../../hooks/useProviders';
import { usePersonas } from '../../../hooks/usePersonas';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import InfoIcon from '@mui/icons-material/Info';

interface AgentCardProps {
  agent: Agent;
  configurable?: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, configurable }) => {
  const [llmProvider, setLlmProvider] = useState(agent.llmProvider || '');
  const [messengerProvider, setMessengerProvider] = useState(agent.provider || '');
  const [persona, setPersona] = useState(agent.persona || '');
  const [systemInstruction, setSystemInstruction] = useState(agent.systemInstruction || '');
  const [mcpServers, setMcpServers] = useState<any[]>(agent.mcpServers || []);
  const [mcpGuard, setMcpGuard] = useState<any>(agent.mcpGuard || { enabled: false, type: 'owner' });
  const [newMcpServer, setNewMcpServer] = useState({ name: '', serverUrl: '', apiKey: '' });
  const [connected, setConnected] = useState(false);

  const { llmProviders, messengerProviders, loading: providersLoading, error: providersError } = useProviders();

  const fallbackMessengerProviders: ProviderInfo[] = [
    { key: 'discord', label: 'Discord' },
    { key: 'slack', label: 'Slack' },
    { key: 'mattermost', label: 'Mattermost' },
  ];

  const fallbackLlmProviders: ProviderInfo[] = [
    { key: 'openai', label: 'OpenAI' },
    { key: 'flowise', label: 'Flowise' },
    { key: 'openwebui', label: 'OpenWebUI' },
  ];

  const messengerOptions = messengerProviders.length ? messengerProviders : fallbackMessengerProviders;
  const llmOptions = llmProviders.length ? llmProviders : fallbackLlmProviders;
  const { personas, loading: personasLoading, error: personasError } = usePersonas();

  useEffect(() => {
    setLlmProvider(agent.llmProvider || '');
    setMessengerProvider(agent.provider || '');
    setPersona(agent.persona || '');
    setSystemInstruction(agent.systemInstruction || '');
    setMcpServers(agent.mcpServers || []);
    setMcpGuard(agent.mcpGuard || { enabled: false, type: 'owner' });
  }, [agent]);

  const handleLlmChange = (event: any) => {
    setLlmProvider(event.target.value);
    updateConnectionStatus(event.target.value, messengerProvider, persona);
  };

  const handleMessengerChange = (event: any) => {
    setMessengerProvider(event.target.value);
    updateConnectionStatus(llmProvider, event.target.value, persona);
  };

  const handlePersonaChange = (event: any) => {
    setPersona(event.target.value);
    updateConnectionStatus(llmProvider, messengerProvider, event.target.value);
  };

  const handleSystemInstructionChange = (event: any) => {
    setSystemInstruction(event.target.value);
  };

  const handleMcpGuardChange = (field: string, value: any) => {
    setMcpGuard((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleAddMcpServer = () => {
    if (newMcpServer.name && newMcpServer.serverUrl) {
      setMcpServers([...mcpServers, newMcpServer]);
      setNewMcpServer({ name: '', serverUrl: '', apiKey: '' });
    }
  };

  const handleRemoveMcpServer = (index: number) => {
    const updatedServers = [...mcpServers];
    updatedServers.splice(index, 1);
    setMcpServers(updatedServers);
  };

  const updateConnectionStatus = (llm: string, messenger: string, p: string) => {
    if (llm && messenger && p) {
      // Simulate connection attempt
      setTimeout(() => {
        setConnected(true);
      }, 1000);
    } else {
      setConnected(false);
    }
  };

  const isConfigured = llmProvider && messengerProvider && persona;

  // Check for environment variable overrides
  const hasEnvOverrides = agent.envOverrides && Object.keys(agent.envOverrides).length > 0;

  if (!configurable) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{agent.name}</Typography>
            <Chip label="online" color="success" size="small" />
          </Box>
          <Box mt={2}>
            <Typography variant="body2">Provider: {agent.provider}</Typography>
            {agent.persona && <Typography variant="body2">Persona: {agent.persona}</Typography>}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ 
      textDecoration: isConfigured ? 'none' : 'line-through',
      border: hasEnvOverrides ? '2px solid #1976d2' : 'none'
    }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {agent.name}
            {hasEnvOverrides && (
              <Tooltip title="This agent has environment variable overrides">
                <InfoIcon sx={{ fontSize: 16, ml: 1, color: '#1976d2' }} />
              </Tooltip>
            )}
          </Typography>
          <Box>
            {isConfigured ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />}
            {connected ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />}
          </Box>
        </Box>
        
        {hasEnvOverrides && (
          <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
            <Typography variant="body2">
              This agent has environment variable overrides. Some fields are read-only.
            </Typography>
          </Alert>
        )}
        
        <Box mt={2}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>LLM Provider</InputLabel>
            <Select 
              value={llmProvider} 
              label="LLM Provider" 
              onChange={handleLlmChange} 
              disabled={providersLoading || (agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_LLM_PROVIDER']?.isOverridden)}
            >
              {llmOptions.map((provider) => (
                <MenuItem key={provider.key} value={provider.key}>
                  {provider.label}
                  {agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_LLM_PROVIDER']?.isOverridden && (
                    <Chip 
                      label={`ENV: ${agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_LLM_PROVIDER']?.redactedValue}`} 
                      size="small" 
                      sx={{ ml: 1, fontSize: '0.7rem' }} 
                    />
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Messenger Provider</InputLabel>
            <Select 
              value={messengerProvider} 
              label="Messenger Provider" 
              onChange={handleMessengerChange} 
              disabled={providersLoading || (agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_MESSAGE_PROVIDER']?.isOverridden)}
            >
              {messengerOptions.map((provider) => (
                <MenuItem key={provider.key} value={provider.key}>
                  {provider.label}
                  {agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_MESSAGE_PROVIDER']?.isOverridden && (
                    <Chip 
                      label={`ENV: ${agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_MESSAGE_PROVIDER']?.redactedValue}`} 
                      size="small" 
                      sx={{ ml: 1, fontSize: '0.7rem' }} 
                    />
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Persona</InputLabel>
            <Select 
              value={persona} 
              label="Persona" 
              onChange={handlePersonaChange} 
              disabled={personasLoading || (agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_PERSONA']?.isOverridden)}
            >
              {personas.map((p) => (
                <MenuItem key={p.key} value={p.key}>
                  {p.name}
                  {agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_PERSONA']?.isOverridden && (
                    <Chip 
                      label={`ENV: ${agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_PERSONA']?.redactedValue}`} 
                      size="small" 
                      sx={{ ml: 1, fontSize: '0.7rem' }} 
                    />
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="System Instruction"
            multiline
            rows={3}
            value={systemInstruction}
            onChange={handleSystemInstructionChange}
            sx={{ mb: 2 }}
            disabled={agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_SYSTEM_INSTRUCTION']?.isOverridden}
            helperText={
              agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_SYSTEM_INSTRUCTION']?.isOverridden 
                ? `Overridden by ENV: ${agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_SYSTEM_INSTRUCTION']?.redactedValue}` 
                : ""
            }
          />
          
          {/* MCP Servers Section */}
          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>MCP Servers</Typography>
          <List>
            {mcpServers.map((server, index) => (
              <ListItem key={index} secondaryAction={
                <IconButton edge="end" onClick={() => handleRemoveMcpServer(index)}>
                  <DeleteIcon />
                </IconButton>
              }>
                <ListItemText primary={server.name} secondary={server.serverUrl} />
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              label="Server Name"
              value={newMcpServer.name}
              onChange={(e) => setNewMcpServer({...newMcpServer, name: e.target.value})}
              size="small"
            />
            <TextField
              label="Server URL"
              value={newMcpServer.serverUrl}
              onChange={(e) => setNewMcpServer({...newMcpServer, serverUrl: e.target.value})}
              size="small"
              fullWidth
            />
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />} 
              onClick={handleAddMcpServer}
              disabled={!newMcpServer.name || !newMcpServer.serverUrl}
            >
              Add
            </Button>
          </Box>
          
          {/* MCP Guard Section */}
          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>MCP Tool Usage Guard</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={mcpGuard.enabled}
                onChange={(e) => handleMcpGuardChange('enabled', e.target.checked)}
              />
            }
            label="Enable MCP Tool Usage Guard"
          />
          
          {mcpGuard.enabled && (
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Guard Type</InputLabel>
                <Select 
                  value={mcpGuard.type} 
                  label="Guard Type" 
                  onChange={(e) => handleMcpGuardChange('type', e.target.value)}
                >
                  <MenuItem value="owner">Forum Owner Only</MenuItem>
                  <MenuItem value="custom">Custom User List</MenuItem>
                </Select>
              </FormControl>
              
              {mcpGuard.type === 'custom' && (
                <TextField
                  fullWidth
                  label="Allowed User IDs (comma-separated)"
                  multiline
                  rows={2}
                  value={mcpGuard.allowedUserIds?.join(', ') || ''}
                  onChange={(e) => handleMcpGuardChange('allowedUserIds', e.target.value.split(',').map(id => id.trim()))}
                />
              )}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AgentCard;
