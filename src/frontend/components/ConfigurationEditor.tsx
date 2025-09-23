import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { type Bot, apiService } from '../services/api';
import {
  cloneBots,
  hasBotChanges,
  prepareBotUpdate,
  sanitizeBot,
  DEFAULT_LLM_PROVIDERS,
  DEFAULT_MESSAGE_PROVIDERS,
} from './configuration/updateUtils';

interface ConfigurationEditorProps {
  onDirtyChange?: (dirty: boolean) => void;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

interface ProviderField {
  name: string;
  label: string;
  type?: 'text' | 'password' | 'select';
  helperText?: string;
  options?: Array<{ value: string; label: string }>;
  multiline?: boolean;
  rows?: number;
}

const SUB_TABS = [
  { value: 0, label: 'Bot Settings' },
  { value: 1, label: 'LLM Providers' },
  { value: 2, label: 'Message Providers' },
];

const MESSAGE_PROVIDER_FIELDS: Record<string, ProviderField[]> = {
  discord: [
    { name: 'token', label: 'Bot Token', type: 'password' },
    { name: 'clientId', label: 'Client ID' },
    { name: 'guildId', label: 'Guild ID' },
    { name: 'channelId', label: 'Default Channel ID' },
    { name: 'voiceChannelId', label: 'Voice Channel ID' },
  ],
  slack: [
    { name: 'botToken', label: 'Bot Token', type: 'password' },
    { name: 'appToken', label: 'App Level Token', type: 'password' },
    { name: 'signingSecret', label: 'Signing Secret', type: 'password' },
    { name: 'joinChannels', label: 'Channels to Join', helperText: 'Comma separated list of channels' },
    { name: 'defaultChannelId', label: 'Default Channel ID' },
    {
      name: 'mode',
      label: 'Connection Mode',
      type: 'select',
      options: [
        { value: 'socket', label: 'Socket Mode' },
        { value: 'rtm', label: 'RTM' },
      ],
    },
  ],
  mattermost: [
    { name: 'serverUrl', label: 'Server URL' },
    { name: 'token', label: 'Access Token', type: 'password' },
    { name: 'channel', label: 'Channel Identifier' },
  ],
};

const LLM_PROVIDER_FIELDS: Record<string, ProviderField[]> = {
  openai: [
    { name: 'apiKey', label: 'API Key', type: 'password' },
    { name: 'model', label: 'Model' },
    { name: 'baseUrl', label: 'Base URL', helperText: 'Optional custom API endpoint' },
  ],
  flowise: [
    { name: 'apiKey', label: 'API Key', type: 'password' },
    { name: 'apiBaseUrl', label: 'API Base URL' },
  ],
  openwebui: [
    { name: 'apiKey', label: 'API Key', type: 'password' },
    { name: 'apiUrl', label: 'API URL' },
  ],
  openswarm: [
    { name: 'baseUrl', label: 'Base URL' },
    { name: 'apiKey', label: 'API Key', type: 'password' },
    { name: 'team', label: 'Team / Model' },
  ],
  perplexity: [
    { name: 'apiKey', label: 'API Key', type: 'password' },
    { name: 'model', label: 'Model' },
  ],
  replicate: [
    { name: 'apiKey', label: 'API Key', type: 'password' },
    { name: 'model', label: 'Model' },
  ],
  n8n: [
    { name: 'webhookUrl', label: 'Webhook URL' },
    { name: 'authToken', label: 'Auth Token', type: 'password' },
  ],
};

const getMessageProviderDefaults = (provider: string) => {
  switch (provider) {
    case 'discord':
      return { token: '', clientId: '', guildId: '', channelId: '', voiceChannelId: '' };
    case 'slack':
      return { botToken: '', appToken: '', signingSecret: '', joinChannels: '', defaultChannelId: '', mode: 'socket' };
    case 'mattermost':
      return { serverUrl: '', token: '', channel: '' };
    default:
      return {};
  }
};

const getLlmProviderDefaults = (provider: string) => {
  switch (provider) {
    case 'openai':
      return { apiKey: '', model: '', baseUrl: '' };
    case 'flowise':
      return { apiKey: '', apiBaseUrl: '' };
    case 'openwebui':
      return { apiKey: '', apiUrl: '' };
    case 'openswarm':
      return { baseUrl: '', apiKey: '', team: '' };
    case 'perplexity':
    case 'replicate':
      return { apiKey: '', model: '' };
    case 'n8n':
      return { webhookUrl: '', authToken: '' };
    default:
      return {};
  }
};

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const SubTabPanel: React.FC<{ value: number; index: number; children: React.ReactNode }> = ({ value, index, children }) => {
  if (value !== index) {
    return null;
  }
  return <Box sx={{ py: 3 }}>{children}</Box>;
};

const ConfigurationEditor: React.FC<ConfigurationEditorProps> = ({ onDirtyChange }) => {
  const [originalBots, setOriginalBots] = useState<Bot[]>([]);
  const [editedBots, setEditedBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });
  const [addBotDialogOpen, setAddBotDialogOpen] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [activeSection, setActiveSection] = useState(0);
  const [messageProviderToAdd, setMessageProviderToAdd] = useState<Record<string, string>>({});

  const isDirty = useMemo(
    () => hasBotChanges(originalBots, editedBots, DEFAULT_MESSAGE_PROVIDERS, DEFAULT_LLM_PROVIDERS),
    [originalBots, editedBots],
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    fetchBots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBots = async () => {
    if (isDirty) {
      const discard = window.confirm('You have unsaved changes. Discard and reload configuration?');
      if (!discard) {
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      const configResponse = await apiService.getConfig();
      const sanitizedBots = configResponse.bots.map(sanitizeBot);
      setOriginalBots(cloneBots(sanitizedBots));
      setEditedBots(cloneBots(sanitizedBots));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bots');
    } finally {
      setLoading(false);
    }
  };

  const updateBotState = useCallback((botName: string, updater: (bot: Bot) => Bot) => {
    setEditedBots((prev) => prev.map((bot) => (bot.name === botName ? updater(bot) : bot)));
  }, []);

  const handleBotFieldChange = (botName: string, field: keyof Bot, value: any) => {
    updateBotState(botName, (bot) => ({ ...bot, [field]: value }));
  };

  const ensureMessageProviderConfig = (bot: Bot, provider: string) => {
    const currentConfig = (bot as any)[provider];
    if (currentConfig) {
      return bot;
    }
    return { ...bot, [provider]: getMessageProviderDefaults(provider) } as Bot;
  };

  const ensureLlmProviderConfig = (bot: Bot, provider: string) => {
    const currentConfig = (bot as any)[provider];
    if (currentConfig) {
      return bot;
    }
    return { ...bot, [provider]: getLlmProviderDefaults(provider) } as Bot;
  };

  const handleMessageProviderChange = (botName: string, provider: string) => {
    updateBotState(botName, (bot) => {
      const nextBot = ensureMessageProviderConfig(bot, provider);
      return { ...nextBot, messageProvider: provider };
    });
  };

  const handleLlmProviderChange = (botName: string, provider: string) => {
    updateBotState(botName, (bot) => {
      const nextBot = ensureLlmProviderConfig(bot, provider);
      return { ...nextBot, llmProvider: provider };
    });
  };

  const handleProviderFieldChange = (botName: string, provider: string, field: string, value: string) => {
    updateBotState(botName, (bot) => {
      const currentConfig = { ...((bot as any)[provider] || {}) };
      currentConfig[field] = value;
      return { ...bot, [provider]: currentConfig } as Bot;
    });
  };

  const handleAddMessageProviderConfig = (botName: string, provider: string) => {
    if (!provider) return;
    updateBotState(botName, (bot) => ({ ...ensureMessageProviderConfig(bot, provider) }));
    setMessageProviderToAdd((prev) => ({ ...prev, [botName]: '' }));
  };

  const handleMcpToolChange = (botName: string, index: number, field: 'name' | 'serverUrl', value: string) => {
    updateBotState(botName, (bot) => {
      const currentServers = Array.isArray(bot.mcpServers) ? [...bot.mcpServers] : [];
      const existing = currentServers[index] ?? { name: '', serverUrl: '' };
      const updated = { ...existing, [field]: value };
      currentServers[index] = updated;
      return { ...bot, mcpServers: currentServers };
    });
  };

  const handleRemoveMcpTool = (botName: string, index: number) => {
    updateBotState(botName, (bot) => {
      const currentServers = Array.isArray(bot.mcpServers) ? [...bot.mcpServers] : [];
      currentServers.splice(index, 1);
      return { ...bot, mcpServers: currentServers };
    });
  };

  const handleAddMcpTool = (botName: string) => {
    updateBotState(botName, (bot) => {
      const currentServers = Array.isArray(bot.mcpServers) ? [...bot.mcpServers] : [];
      currentServers.push({ name: '', serverUrl: '' });
      return { ...bot, mcpServers: currentServers };
    });
  };

  const handleSave = async () => {
    if (!isDirty) {
      return;
    }

    try {
      setSaving(true);
      for (const editedBot of editedBots) {
        const originalBot = originalBots.find((bot) => bot.name === editedBot.name);
        if (!originalBot) continue;
        const payload = prepareBotUpdate(originalBot, editedBot, DEFAULT_MESSAGE_PROVIDERS, DEFAULT_LLM_PROVIDERS);
        if (payload) {
          await apiService.updateBot(editedBot.name, payload as any);
        }
      }

      setOriginalBots(cloneBots(editedBots));
      setSnackbar({ open: true, message: 'Configuration saved successfully', severity: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to save configuration',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddBot = async () => {
    if (!newBotName.trim()) return;

    try {
      setSaving(true);
      const response = await apiService.createBot({
        name: newBotName,
        messageProvider: 'discord',
        llmProvider: 'openai',
      });

      const newBot = sanitizeBot(response.bot);
      setOriginalBots((prev) => [...prev, newBot]);
      setEditedBots((prev) => [...prev, newBot]);
      setNewBotName('');
      setAddBotDialogOpen(false);
      setSnackbar({ open: true, message: 'Bot added successfully', severity: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to add bot',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const renderProviderFields = (bot: Bot, provider: string, fields: ProviderField[], providerType: 'message' | 'llm') => (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {fields.map((field) => {
        const currentValue = ((bot as any)[provider] ?? {})[field.name] ?? '';

        if (field.type === 'select') {
          return (
            <Grid item xs={12} sm={6} key={`${provider}-${field.name}`}>
              <FormControl fullWidth>
                <InputLabel>{field.label}</InputLabel>
                <Select
                  value={currentValue}
                  label={field.label}
                  onChange={(e) => handleProviderFieldChange(bot.name, provider, field.name, e.target.value)}
                >
                  {field.options?.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          );
        }

        return (
          <Grid item xs={12} sm={6} key={`${provider}-${field.name}`}>
            <TextField
              fullWidth
              type={field.type === 'password' ? 'password' : 'text'}
              label={field.label}
              value={currentValue}
              onChange={(e) => handleProviderFieldChange(bot.name, provider, field.name, e.target.value)}
              helperText={field.helperText}
              multiline={field.multiline}
              rows={field.rows}
            />
          </Grid>
        );
      })}
      {providerType === 'message' && provider === bot.messageProvider && (
        <Grid item xs={12}>
          <Alert severity="info">This provider is currently active for the bot&apos;s messaging.</Alert>
        </Grid>
      )}
      {providerType === 'llm' && provider === bot.llmProvider && (
        <Grid item xs={12}>
          <Alert severity="info">This provider is currently active for the bot&apos;s LLM responses.</Alert>
        </Grid>
      )}
    </Grid>
  );

  const renderBotSettings = () => (
    <Box>
      {editedBots.map((bot) => (
        <Accordion key={bot.name} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{bot.name}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Message Provider</InputLabel>
                <Select
                  value={bot.messageProvider || ''}
                  label="Message Provider"
                  onChange={(e) => handleMessageProviderChange(bot.name, e.target.value)}
                >
                  {DEFAULT_MESSAGE_PROVIDERS.map((provider) => (
                    <MenuItem key={provider} value={provider}>
                      {capitalize(provider)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>LLM Provider</InputLabel>
                <Select
                  value={bot.llmProvider || ''}
                  label="LLM Provider"
                  onChange={(e) => handleLlmProviderChange(bot.name, e.target.value)}
                >
                  {DEFAULT_LLM_PROVIDERS.map((provider) => (
                    <MenuItem key={provider} value={provider}>
                      {capitalize(provider)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Persona"
                value={bot.persona || ''}
                onChange={(e) => handleBotFieldChange(bot.name, 'persona', e.target.value)}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="System Instruction"
                value={bot.systemInstruction || ''}
                onChange={(e) => handleBotFieldChange(bot.name, 'systemInstruction', e.target.value)}
              />

              <Typography variant="subtitle1">MCP Tools</Typography>
              <List>
                {(Array.isArray(bot.mcpServers) ? bot.mcpServers : []).map((tool, index) => (
                  typeof tool === 'object' && tool !== null && (
                    <ListItem key={`${bot.name}-mcp-${index}`} sx={{ gap: 2 }}>
                      <ListItemText
                        primary={
                          <TextField
                            label="Tool Name"
                            value={(tool as any).name || ''}
                            onChange={(e) => handleMcpToolChange(bot.name, index, 'name', e.target.value)}
                          />
                        }
                        secondary={
                          <TextField
                            label="Server URL"
                            value={(tool as any).serverUrl || ''}
                            onChange={(e) => handleMcpToolChange(bot.name, index, 'serverUrl', e.target.value)}
                          />
                        }
                      />
                      <IconButton onClick={() => handleRemoveMcpTool(bot.name, index)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItem>
                  )
                ))}
              </List>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleAddMcpTool(bot.name)}>
                Add MCP Tool
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  const renderLlmProviders = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {editedBots.map((bot) => (
        <Card key={`llm-${bot.name}`} variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {bot.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select the LLM provider and configure credentials for this bot.
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Provider</InputLabel>
              <Select
                value={bot.llmProvider || ''}
                label="Select Provider"
                onChange={(e) => handleLlmProviderChange(bot.name, e.target.value)}
              >
                {DEFAULT_LLM_PROVIDERS.map((provider) => (
                  <MenuItem key={provider} value={provider}>
                    {capitalize(provider)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {bot.llmProvider ? (
              <Box>
                {renderProviderFields(
                  ensureLlmProviderConfig(bot, bot.llmProvider),
                  bot.llmProvider,
                  LLM_PROVIDER_FIELDS[bot.llmProvider] || [],
                  'llm',
                )}
                {!LLM_PROVIDER_FIELDS[bot.llmProvider] && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    This provider does not have predefined fields yet. Configuration will be stored as-is when saved.
                  </Alert>
                )}
              </Box>
            ) : (
              <Alert severity="warning">Select a provider to configure LLM settings.</Alert>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  const renderMessageProviders = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {editedBots.map((bot) => {
        const configuredProviders = DEFAULT_MESSAGE_PROVIDERS.filter((provider) => Boolean((bot as any)[provider]));
        const availableProviders = DEFAULT_MESSAGE_PROVIDERS.filter((provider) => !configuredProviders.includes(provider));
        return (
          <Card key={`message-${bot.name}`} variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {bot.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Manage messaging provider credentials for this bot.
              </Typography>

              {configuredProviders.length === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No provider configuration added yet. Use the selector below to add one.
                </Alert>
              )}

              {configuredProviders.map((provider) => (
                <Box key={`${bot.name}-${provider}`} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1">{capitalize(provider)} Configuration</Typography>
                    {provider !== bot.messageProvider && (
                      <Button
                        color="error"
                        size="small"
                        onClick={() =>
                          updateBotState(bot.name, (current) => {
                            const updated = { ...current } as any;
                            delete updated[provider];
                            return updated;
                          })
                        }
                      >
                        Remove
                      </Button>
                    )}
                  </Box>
                  {renderProviderFields(bot, provider, MESSAGE_PROVIDER_FIELDS[provider] || [], 'message')}
                  {!MESSAGE_PROVIDER_FIELDS[provider] && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      This provider does not have predefined fields yet. Configuration will be stored as-is when saved.
                    </Alert>
                  )}
                </Box>
              ))}

              {availableProviders.length > 0 && (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <FormControl fullWidth>
                    <InputLabel>Add Message Provider</InputLabel>
                    <Select
                      value={messageProviderToAdd[bot.name] || ''}
                      label="Add Message Provider"
                      onChange={(e) =>
                        setMessageProviderToAdd((prev) => ({
                          ...prev,
                          [bot.name]: e.target.value,
                        }))
                      }
                    >
                      {availableProviders.map((provider) => (
                        <MenuItem key={provider} value={provider}>
                          {capitalize(provider)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    disabled={!messageProviderToAdd[bot.name]}
                    onClick={() => handleAddMessageProviderConfig(bot.name, messageProviderToAdd[bot.name])}
                  >
                    Add Configuration
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" component="h2">
            Server Configuration
          </Typography>
          {isDirty && (
            <Typography variant="body2" color="warning.main">
              You have unsaved changes. Save to apply them.
            </Typography>
          )}
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchBots}
            disabled={loading || saving}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            disabled={!isDirty || saving}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
          <Fab color="primary" size="small" onClick={() => setAddBotDialogOpen(true)}>
            <AddIcon />
          </Fab>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && <CircularProgress sx={{ mb: 2 }} />}

      <PaperTabs value={activeSection} onChange={(_, value) => setActiveSection(value)} />

      <SubTabPanel value={activeSection} index={0}>
        {renderBotSettings()}
      </SubTabPanel>

      <SubTabPanel value={activeSection} index={1}>
        {renderLlmProviders()}
      </SubTabPanel>

      <SubTabPanel value={activeSection} index={2}>
        {renderMessageProviders()}
      </SubTabPanel>

      <Dialog open={addBotDialogOpen} onClose={() => setAddBotDialogOpen(false)}>
        <DialogTitle>Add New Bot</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Bot Name"
            fullWidth
            variant="standard"
            value={newBotName}
            onChange={(e) => setNewBotName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddBotDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddBot} disabled={!newBotName.trim() || saving}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

interface PaperTabsProps {
  value: number;
  onChange: (event: React.SyntheticEvent, value: number) => void;
}

const PaperTabs: React.FC<PaperTabsProps> = ({ value, onChange }) => (
  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
    <Tabs
      value={value}
      onChange={onChange}
      aria-label="server configuration sections"
      variant="scrollable"
      scrollButtons="auto"
    >
      {SUB_TABS.map((tab) => (
        <Tab key={tab.value} label={tab.label} />
      ))}
    </Tabs>
  </Box>
);

export default ConfigurationEditor;
