import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  ContentCopy as CloneIcon,
  ExpandMore as ExpandMoreIcon,
  SmartToy as BotIcon,
} from '@mui/icons-material';
import { apiService, type Bot } from '../services/api';

interface BotManagerProps {
  onBotSelect?: (bot: unknown) => void;
}

const BotManager: React.FC<BotManagerProps> = ({ onBotSelect }) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    messageProvider: '',
    llmProvider: '',
    persona: '',
    systemInstruction: '',
  });

  const messageProviders = ['discord', 'slack', 'mattermost'];
  const llmProviders = ['openai', 'flowise', 'openwebui', 'openswarm', 'perplexity', 'replicate', 'n8n'];

  const fetchBots = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getConfig();
      setBots(response.bots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const handleCreateBot = async () => {
    try {
      await apiService.createBot({
        name: formData.name,
        messageProvider: formData.messageProvider,
        llmProvider: formData.llmProvider,
      });

      setSnackbar({ open: true, message: 'Bot created successfully', severity: 'success' });
      setCreateDialogOpen(false);
      setFormData({ name: '', messageProvider: '', llmProvider: '', persona: '', systemInstruction: '' });
      fetchBots();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to create bot',
        severity: 'error'
      });
    }
  };

  const handleEditBot = async () => {
    if (!selectedBot) return;

    try {
      await apiService.updateBot(selectedBot.id, {
        name: formData.name,
        messageProvider: formData.messageProvider,
        llmProvider: formData.llmProvider,
        persona: formData.persona,
        systemInstruction: formData.systemInstruction
      });

      setSnackbar({ open: true, message: 'Bot updated successfully', severity: 'success' });
      setEditDialogOpen(false);
      setSelectedBot(null);
      setFormData({ name: '', messageProvider: '', llmProvider: '', persona: '', systemInstruction: '' });
      fetchBots();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to update bot',
        severity: 'error'
      });
    }
  };

  const handleDeleteBot = async (botName: string) => {
    if (!confirm(`Are you sure you want to delete bot "${botName}"?`)) return;

    try {
      await apiService.deleteBot(botName);
      setSnackbar({ open: true, message: 'Bot deleted successfully', severity: 'success' });
      fetchBots();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to delete bot',
        severity: 'error'
      });
    }
  };

  const handleCloneBot = async (botName: string) => {
    const newName = prompt(`Enter new name for cloned bot "${botName}":`);
    if (!newName) return;

    try {
      await apiService.cloneBot(botName, newName);
      setSnackbar({ open: true, message: 'Bot cloned successfully', severity: 'success' });
      fetchBots();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to clone bot',
        severity: 'error'
      });
    }
  };

  const openEditDialog = (bot: Bot) => {
    setSelectedBot(bot);
    setFormData({
      name: bot.name,
      messageProvider: bot.messageProvider,
      llmProvider: bot.llmProvider,
      persona: bot.persona || '',
      systemInstruction: bot.systemInstruction || '',
    });
    setEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    setFormData({ name: '', messageProvider: '', llmProvider: '', persona: '', systemInstruction: '' });
    setCreateDialogOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Bot Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          Create Bot
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box>
        {bots.map((bot) => (
          <Accordion key={bot.name} sx={{ mb: 2 }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Box display="flex" alignItems="center" gap={2} width="100%">
                <BotIcon color="primary" />
                <Box flex={1}>
                  <Typography variant="h6" component="div">
                    {bot.name}
                  </Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <Chip
                      label={bot.messageProvider}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                    <Chip
                      label={bot.llmProvider}
                      color="secondary"
                      variant="outlined"
                      size="small"
                    />
                    {bot.persona && (
                      <Chip
                        label={bot.persona}
                        variant="outlined"
                        size="small"
                      />
                    )}
                    <Chip
                      label="Active"
                      color="success"
                      size="small"
                    />
                  </Box>
                </Box>
                <Box display="flex" gap={1}>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => openEditDialog(bot)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Clone">
                    <IconButton
                      size="small"
                      onClick={() => handleCloneBot(bot.name)}
                    >
                      <CloneIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Start">
                    <IconButton
                      size="small"
                      onClick={() => setSnackbar({ open: true, message: 'Bot start functionality not yet implemented', severity: 'success' })}
                      color="success"
                    >
                      <StartIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Stop">
                    <IconButton
                      size="small"
                      onClick={() => setSnackbar({ open: true, message: 'Bot stop functionality not yet implemented', severity: 'success' })}
                      color="warning"
                    >
                      <StopIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteBot(bot.name)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Configuration
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={1}>
                        <Typography variant="body2">
                          <strong>Message Provider:</strong> {bot.messageProvider}
                        </Typography>
                        <Typography variant="body2">
                          <strong>LLM Provider:</strong> {bot.llmProvider}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Persona:</strong> {bot.persona || 'None'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>System Instruction:</strong> {bot.systemInstruction || 'None'}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        MCP Servers
                      </Typography>
                      {Array.isArray(bot.mcpServers) && bot.mcpServers.length > 0 ? (
                        <Box>
                          {bot.mcpServers.map((server, index) => (
                            <Chip
                              key={index}
                              label={typeof server === 'object' && server.name ? server.name : `Server ${index + 1}`}
                              variant="outlined"
                              size="small"
                              sx={{ mr: 1, mb: 1 }}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No MCP servers configured
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Create Bot Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Bot</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Bot Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <Box display="flex" gap={2} sx={{ mb: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Message Provider</InputLabel>
                <Select
                  value={formData.messageProvider}
                  onChange={(e) => setFormData({ ...formData, messageProvider: e.target.value })}
                >
                  {messageProviders.map((provider) => (
                    <MenuItem key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel>LLM Provider</InputLabel>
                <Select
                  value={formData.llmProvider}
                  onChange={(e) => setFormData({ ...formData, llmProvider: e.target.value })}
                >
                  {llmProviders.map((provider) => (
                    <MenuItem key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateBot} variant="contained">
            Create Bot
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Bot Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Bot</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Bot Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <Box display="flex" gap={2} sx={{ mb: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Message Provider</InputLabel>
                <Select
                  value={formData.messageProvider}
                  onChange={(e) => setFormData({ ...formData, messageProvider: e.target.value })}
                >
                  {messageProviders.map((provider) => (
                    <MenuItem key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel>LLM Provider</InputLabel>
                <Select
                  value={formData.llmProvider}
                  onChange={(e) => setFormData({ ...formData, llmProvider: e.target.value })}
                >
                  {llmProviders.map((provider) => (
                    <MenuItem key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <TextField
              fullWidth
              label="Persona"
              value={formData.persona}
              onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="System Instruction"
              value={formData.systemInstruction}
              onChange={(e) => setFormData({ ...formData, systemInstruction: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditBot} variant="contained">
            Update Bot
          </Button>
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

export default BotManager;
