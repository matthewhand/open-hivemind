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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  ContentCopy as CloneIcon,
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Message Provider</TableCell>
              <TableCell>LLM Provider</TableCell>
              <TableCell>Persona</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bots.map((bot) => (
              <TableRow key={bot.name} hover>
                <TableCell>
                  <Typography variant="body1" fontWeight="medium">
                    {bot.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={bot.messageProvider}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={bot.llmProvider}
                    color="secondary"
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {bot.persona && (
                    <Chip
                      label={bot.persona}
                      variant="outlined"
                      size="small"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label="Active"
                    color="success"
                    size="small"
                  />
                </TableCell>
                <TableCell>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
