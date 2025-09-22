import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Checkbox,
  FormGroup,
  Paper,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Code as CodeIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { green, red, orange, grey } from '@mui/material/colors';

interface Agent {
  id: string;
  name: string;
  messageProvider: string;
  llmProvider: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers: string[];
  mcpGuard: {
    enabled: boolean;
    type: 'owner' | 'custom';
    allowedUserIds: string[];
  };
  isActive: boolean;
  isRunning?: boolean;
  envOverrides?: Record<string, { isOverridden: boolean; redactedValue?: string }>;
}

interface Provider {
  id: string;
  name: string;
  description: string;
  configRequired: string[];
  envVarPrefix: string;
}

interface Persona {
  key: string;
  name: string;
  systemPrompt: string;
}

interface MCPServer {
  name: string;
  url: string;
  connected: boolean;
  tools?: Array<{ name: string; description: string }>;
}

const EnhancedAgentConfigurator: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messageProviders, setMessageProviders] = useState<Provider[]>([]);
  const [llmProviders, setLlmProviders] = useState<Provider[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Form state for new/editing agent
  const [agentForm, setAgentForm] = useState<Partial<Agent>>({
    name: '',
    messageProvider: '',
    llmProvider: '',
    persona: 'default',
    systemInstruction: '',
    mcpServers: [],
    mcpGuard: {
      enabled: false,
      type: 'owner',
      allowedUserIds: []
    },
    isActive: true
  });

  const [guardUserInput, setGuardUserInput] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [agentsRes, providersRes, personasRes, mcpRes] = await Promise.all([
        fetch('/api/admin/agents'),
        fetch('/api/admin/providers'),
        fetch('/api/admin/agents/personas'),
        fetch('/api/admin/mcp/servers')
      ]);

      const [agentsData, providersData, personasData, mcpData] = await Promise.all([
        agentsRes.json(),
        providersRes.json(),
        personasRes.json(),
        mcpRes.json()
      ]);

      setAgents(agentsData.agents || []);
      setMessageProviders(providersData.messageProviders || []);
      setLlmProviders(providersData.llmProviders || []);
      setPersonas(personasData.personas || []);
      setMcpServers(mcpData.servers || []);
    } catch (err) {
      setError('Failed to fetch configuration data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setAgentForm({
      name: '',
      messageProvider: '',
      llmProvider: '',
      persona: 'default',
      systemInstruction: '',
      mcpServers: [],
      mcpGuard: {
        enabled: false,
        type: 'owner',
        allowedUserIds: []
      },
      isActive: true
    });
    setGuardUserInput('');
    setOpenCreateDialog(true);
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setAgentForm(agent);
    setGuardUserInput(agent.mcpGuard.allowedUserIds.join(', '));
    setOpenCreateDialog(true);
  };

  const handleSaveAgent = async () => {
    try {
      const agentData = {
        ...agentForm,
        mcpGuard: {
          ...agentForm.mcpGuard!,
          allowedUserIds: guardUserInput.split(',').map(id => id.trim()).filter(id => id)
        }
      };

      if (editingAgent) {
        // Update existing agent
        const response = await fetch(`/api/admin/agents/${editingAgent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agentData)
        });
        if (!response.ok) throw new Error('Failed to update agent');
      } else {
        // Create new agent
        const response = await fetch('/api/admin/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agentData)
        });
        if (!response.ok) throw new Error('Failed to create agent');
      }

      setOpenCreateDialog(false);
      fetchData();
    } catch (err) {
      setError(`Failed to save agent: ${err}`);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const response = await fetch(`/api/admin/agents/${agentId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete agent');
      fetchData();
    } catch (err) {
      setError(`Failed to delete agent: ${err}`);
    }
  };

  const handleToggleAgent = async (agent: Agent) => {
    try {
      const response = await fetch(`/api/admin/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...agent, isActive: !agent.isActive })
      });
      if (!response.ok) throw new Error('Failed to toggle agent');
      fetchData();
    } catch (err) {
      setError(`Failed to toggle agent: ${err}`);
    }
  };

  const getAgentStatus = (agent: Agent) => {
    const hasMessageProvider = agent.messageProvider && messageProviders.some(p => p.id === agent.messageProvider);
    const hasLlmProvider = agent.llmProvider && llmProviders.some(p => p.id === agent.llmProvider);
    const hasOverrides = agent.envOverrides && Object.keys(agent.envOverrides).length > 0;

    if (!hasMessageProvider || !hasLlmProvider) {
      return { status: 'incomplete', color: red[500], icon: <CancelIcon /> };
    }
    if (hasOverrides) {
      return { status: 'env-override', color: orange[500], icon: <WarningIcon /> };
    }
    if (agent.isRunning) {
      return { status: 'running', color: green[500], icon: <CheckIcon /> };
    }
    if (agent.isActive) {
      return { status: 'ready', color: green[300], icon: <CheckIcon /> };
    }
    return { status: 'inactive', color: grey[500], icon: <CancelIcon /> };
  };

  const isFormValid = () => {
    return agentForm.name && 
           agentForm.messageProvider && 
           agentForm.llmProvider;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Agent Configuration
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateAgent}
          >
            Create Agent
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {agents.map((agent) => {
          const status = getAgentStatus(agent);
          return (
            <Grid item xs={12} md={6} lg={4} key={agent.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  border: `2px solid ${status.color}`,
                  position: 'relative'
                }}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Typography variant="h6" component="h3" sx={{ flexGrow: 1 }}>
                      {agent.name}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      {status.icon}
                      <Typography variant="caption" color={status.color}>
                        {status.status}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Provider Configuration */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Message Provider
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label={agent.messageProvider || 'Not Set'} 
                        size="small"
                        color={agent.messageProvider ? 'primary' : 'default'}
                      />
                      {agent.envOverrides && Object.keys(agent.envOverrides).some(key => 
                        key.toLowerCase().includes(agent.messageProvider?.toLowerCase() || '')
                      ) && (
                        <Tooltip title="Environment variable override active">
                          <SettingsIcon fontSize="small" color="warning" />
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      LLM Provider
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label={agent.llmProvider || 'Not Set'} 
                        size="small"
                        color={agent.llmProvider ? 'secondary' : 'default'}
                      />
                      {agent.envOverrides && Object.keys(agent.envOverrides).some(key => 
                        key.toLowerCase().includes(agent.llmProvider?.toLowerCase() || '')
                      ) && (
                        <Tooltip title="Environment variable override active">
                          <SettingsIcon fontSize="small" color="warning" />
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  {/* Persona */}
                  {agent.persona && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Persona
                      </Typography>
                      <Chip 
                        label={personas.find(p => p.key === agent.persona)?.name || agent.persona} 
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  )}

                  {/* MCP Servers */}
                  {agent.mcpServers.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        MCP Servers ({agent.mcpServers.length})
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {agent.mcpServers.slice(0, 3).map((serverName) => {
                          const server = mcpServers.find(s => s.name === serverName);
                          return (
                            <Chip 
                              key={serverName}
                              label={serverName} 
                              size="small"
                              color={server?.connected ? 'success' : 'default'}
                            />
                          );
                        })}
                        {agent.mcpServers.length > 3 && (
                          <Chip 
                            label={`+${agent.mcpServers.length - 3} more`} 
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* MCP Guard */}
                  {agent.mcpGuard.enabled && (
                    <Box sx={{ mb: 2 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <SecurityIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" color="text.secondary">
                          MCP Guard: {agent.mcpGuard.type}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Environment Overrides Warning */}
                  {agent.envOverrides && Object.keys(agent.envOverrides).length > 0 && (
                    <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                      <Typography variant="caption">
                        {Object.keys(agent.envOverrides).length} environment variable override(s) active
                      </Typography>
                    </Alert>
                  )}

                  {/* Actions */}
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={agent.isActive}
                          onChange={() => handleToggleAgent(agent)}
                          size="small"
                        />
                      }
                      label="Active"
                    />
                    <Box display="flex" gap={1}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditAgent(agent)}
                        color="primary"
                      >
                        <SettingsIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteAgent(agent.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Create/Edit Agent Dialog */}
      <Dialog 
        open={openCreateDialog} 
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingAgent ? 'Edit Agent' : 'Create New Agent'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Agent Name"
                  value={agentForm.name || ''}
                  onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Message Provider</InputLabel>
                  <Select
                    value={agentForm.messageProvider || ''}
                    label="Message Provider"
                    onChange={(e) => setAgentForm({ ...agentForm, messageProvider: e.target.value })}
                  >
                    {messageProviders.map((provider) => (
                      <MenuItem key={provider.id} value={provider.id}>
                        {provider.name} - {provider.description}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>LLM Provider</InputLabel>
                  <Select
                    value={agentForm.llmProvider || ''}
                    label="LLM Provider"
                    onChange={(e) => setAgentForm({ ...agentForm, llmProvider: e.target.value })}
                  >
                    {llmProviders.map((provider) => (
                      <MenuItem key={provider.id} value={provider.id}>
                        {provider.name} - {provider.description}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Persona</InputLabel>
                  <Select
                    value={agentForm.persona || 'default'}
                    label="Persona"
                    onChange={(e) => setAgentForm({ ...agentForm, persona: e.target.value })}
                  >
                    {personas.map((persona) => (
                      <MenuItem key={persona.key} value={persona.key}>
                        {persona.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* System Instruction */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Custom System Instruction (optional)"
                  value={agentForm.systemInstruction || ''}
                  onChange={(e) => setAgentForm({ ...agentForm, systemInstruction: e.target.value })}
                  helperText="Override or extend the persona's system prompt"
                />
              </Grid>

              {/* MCP Configuration */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  MCP Configuration
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={mcpServers.map(s => s.name)}
                  value={agentForm.mcpServers || []}
                  onChange={(_, newValue) => setAgentForm({ ...agentForm, mcpServers: newValue })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="MCP Servers"
                      helperText="Select MCP servers to make available to this agent"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const server = mcpServers.find(s => s.name === option);
                      return (
                        <Chip
                          {...getTagProps({ index })}
                          key={option}
                          label={option}
                          color={server?.connected ? 'primary' : 'default'}
                        />
                      );
                    })
                  }
                />
              </Grid>

              {/* MCP Guard */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  MCP Tool Guard
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={agentForm.mcpGuard?.enabled || false}
                      onChange={(e) => setAgentForm({
                        ...agentForm,
                        mcpGuard: { ...agentForm.mcpGuard!, enabled: e.target.checked }
                      })}
                    />
                  }
                  label="Enable MCP Tool Guard"
                />
              </Grid>

              {agentForm.mcpGuard?.enabled && (
                <>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Guard Type</InputLabel>
                      <Select
                        value={agentForm.mcpGuard.type}
                        label="Guard Type"
                        onChange={(e) => setAgentForm({
                          ...agentForm,
                          mcpGuard: { ...agentForm.mcpGuard, type: e.target.value as 'owner' | 'custom' }
                        })}
                      >
                        <MenuItem value="owner">Message Server Owner Only</MenuItem>
                        <MenuItem value="custom">Custom User List</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {agentForm.mcpGuard.type === 'custom' && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Allowed User IDs"
                        value={guardUserInput}
                        onChange={(e) => setGuardUserInput(e.target.value)}
                        helperText="Comma-separated list of user IDs allowed to use MCP tools"
                        placeholder="user1, user2, user3"
                      />
                    </Grid>
                  )}
                </>
              )}

              {/* Active Toggle */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={agentForm.isActive || false}
                      onChange={(e) => setAgentForm({ ...agentForm, isActive: e.target.checked })}
                    />
                  }
                  label="Activate agent immediately"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveAgent} 
            variant="contained"
            disabled={!isFormValid()}
          >
            {editingAgent ? 'Update' : 'Create'} Agent
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedAgentConfigurator;