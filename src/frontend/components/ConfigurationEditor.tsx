import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { type Bot, apiService } from '../services/api';

interface ConfigurationEditorProps {}

const ConfigurationEditor: React.FC<ConfigurationEditorProps> = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [addBotDialogOpen, setAddBotDialogOpen] = useState(false);
  const [newBotName, setNewBotName] = useState('');

  const messageProviders = ['discord', 'slack', 'mattermost'];
  const llmProviders = ['openai', 'flowise', 'openwebui', 'openswarm', 'perplexity', 'replicate', 'n8n'];

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      setLoading(true);
      const configResponse = await apiService.getConfig();
      setBots(configResponse.bots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bots');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBot = async (botName: string, updates: Partial<Bot>) => {
    try {
      setLoading(true);
      const response = await apiService.updateBot(botName, updates);
      setBots(bots.map(b => b.name === botName ? response.bot : b));
      setSnackbar({ open: true, message: 'Bot updated successfully', severity: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bot');
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to update bot',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBot = async () => {
    if (!newBotName.trim()) return;

    try {
      setLoading(true);
      const response = await apiService.createBot({
        name: newBotName,
        messageProvider: 'discord', // default
        llmProvider: 'openai' // default
      });
      setBots([...bots, response.bot]);
      setNewBotName('');
      setAddBotDialogOpen(false);
      setSnackbar({ open: true, message: 'Bot added successfully', severity: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add bot');
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to add bot',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMcpTool = async (botName: string, index: number, field: 'name' | 'serverUrl', value: string) => {
    const bot = bots.find(b => b.name === botName);
    if (!bot || !Array.isArray(bot.mcpServers)) return;

    const updatedMcpServers = [...bot.mcpServers];
    if (updatedMcpServers[index] && typeof updatedMcpServers[index] === 'object') {
      (updatedMcpServers[index] as any)[field] = value;
    }

    await handleUpdateBot(botName, { mcpServers: updatedMcpServers });
  };

  const handleRemoveMcpTool = async (botName: string, index: number) => {
    const bot = bots.find(b => b.name === botName);
    if (!bot || !Array.isArray(bot.mcpServers)) return;

    const updatedMcpServers = bot.mcpServers.filter((_, i) => i !== index);
    await handleUpdateBot(botName, { mcpServers: updatedMcpServers });
  };

  const handleAddMcpTool = async (botName: string) => {
    const bot = bots.find(b => b.name === botName);
    if (!bot) return;

    const updatedMcpServers = Array.isArray(bot.mcpServers) ? [...bot.mcpServers, { name: '', serverUrl: '' }] : [{ name: '', serverUrl: '' }];
    await handleUpdateBot(botName, { mcpServers: updatedMcpServers });
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Bot Configurations
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchBots}
            disabled={loading}
          >
            Refresh
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

      {bots.map((bot) => (
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
                  onChange={(e) => handleUpdateBot(bot.name, { messageProvider: e.target.value })}
                >
                  {messageProviders.map((provider) => (
                    <MenuItem key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>LLM Provider</InputLabel>
                <Select
                  value={bot.llmProvider || ''}
                  onChange={(e) => handleUpdateBot(bot.name, { llmProvider: e.target.value })}
                >
                  {llmProviders.map((provider) => (
                    <MenuItem key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Persona"
                value={bot.persona || ''}
                onChange={(e) => handleUpdateBot(bot.name, { persona: e.target.value })}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="System Instruction"
                value={bot.systemInstruction || ''}
                onChange={(e) => handleUpdateBot(bot.name, { systemInstruction: e.target.value })}
              />

              <Typography variant="h6" gutterBottom>
                MCP Tools
              </Typography>
              <List>
                {(Array.isArray(bot.mcpServers) ? bot.mcpServers : []).map((tool, index) => (
                  typeof tool === 'object' && (
                    <ListItem key={index}>
                      <TextField
                        label="Tool Name"
                        value={tool.name || ''}
                        onChange={(e) => handleUpdateMcpTool(bot.name, index, 'name', e.target.value)}
                        sx={{ mr: 1 }}
                      />
                      <TextField
                        label="Server URL"
                        value={tool.serverUrl || ''}
                        onChange={(e) => handleUpdateMcpTool(bot.name, index, 'serverUrl', e.target.value)}
                        sx={{ mr: 1 }}
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
          <Button onClick={handleAddBot} disabled={loading}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ConfigurationEditor;