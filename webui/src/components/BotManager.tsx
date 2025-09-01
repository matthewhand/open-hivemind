import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  ContentCopy as CloneIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import type { Bot } from '../services/api';

interface BotManagerProps {
  bots: Bot[];
  onBotChange: () => void;
}

const BotManager: React.FC<BotManagerProps> = ({ bots, onBotChange }) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [botName, setBotName] = useState('');
  const [messageProvider, setMessageProvider] = useState('discord');
  const [llmProvider, setLlmProvider] = useState('openai');
  const [discordToken, setDiscordToken] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [newBotName, setNewBotName] = useState('');

  const resetForm = () => {
    setBotName('');
    setMessageProvider('discord');
    setLlmProvider('openai');
    setDiscordToken('');
    setOpenaiApiKey('');
    setNewBotName('');
    setError(null);
    setSuccess(null);
  };

  const handleCreateBot = async () => {
    if (!botName.trim()) {
      setError('Bot name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const config: any = {};

      if (messageProvider === 'discord') {
        config.discord = { token: discordToken };
      }

      if (llmProvider === 'openai') {
        config.openai = { apiKey: openaiApiKey };
      }

      await apiService.createBot({
        name: botName,
        messageProvider,
        llmProvider,
        config,
      });

      setSuccess(`Bot '${botName}' created successfully!`);
      setCreateDialogOpen(false);
      resetForm();
      onBotChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bot');
    } finally {
      setLoading(false);
    }
  };

  const handleCloneBot = async () => {
    if (!selectedBot || !newBotName.trim()) {
      setError('New bot name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiService.cloneBot(selectedBot.name, newBotName);
      setSuccess(`Bot '${selectedBot.name}' cloned as '${newBotName}' successfully!`);
      setCloneDialogOpen(false);
      resetForm();
      onBotChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone bot');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBot = async () => {
    if (!selectedBot) return;

    setLoading(true);
    setError(null);

    try {
      await apiService.deleteBot(selectedBot.name);
      setSuccess(`Bot '${selectedBot.name}' deleted successfully!`);
      setDeleteDialogOpen(false);
      setSelectedBot(null);
      onBotChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bot');
    } finally {
      setLoading(false);
    }
  };

  const openCloneDialog = (bot: Bot) => {
    setSelectedBot(bot);
    setNewBotName(`${bot.name}_copy`);
    setCloneDialogOpen(true);
  };

  const openDeleteDialog = (bot: Bot) => {
    setSelectedBot(bot);
    setDeleteDialogOpen(true);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Bot Instance Manager
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Bot
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box display="flex" flexWrap="wrap" gap={2}>
        {bots.map((bot) => (
          <Card key={bot.name} sx={{ minWidth: 300, flex: '1 1 auto' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Typography variant="h6" component="h3" sx={{ mr: 1 }}>
                  🤖
                </Typography>
                <Typography variant="h6" component="h3">
                  {bot.name}
                </Typography>
              </Box>

              <Box mb={2}>
                <Chip
                  label={`Message: ${bot.messageProvider}`}
                  size="small"
                  sx={{ mr: 1, mb: 1 }}
                />
                <Chip
                  label={`LLM: ${bot.llmProvider}`}
                  size="small"
                  sx={{ mr: 1, mb: 1 }}
                />
              </Box>
            </CardContent>

            <CardActions>
              <Tooltip title="Clone Bot">
                <IconButton
                  size="small"
                  onClick={() => openCloneDialog(bot)}
                  color="primary"
                >
                  <CloneIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete Bot">
                <IconButton
                  size="small"
                  onClick={() => openDeleteDialog(bot)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </CardActions>
          </Card>
        ))}
      </Box>

      {/* Create Bot Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Bot</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Bot Name"
            fullWidth
            variant="outlined"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Message Provider</InputLabel>
            <Select
              value={messageProvider}
              label="Message Provider"
              onChange={(e) => setMessageProvider(e.target.value)}
            >
              <MenuItem value="discord">Discord</MenuItem>
              <MenuItem value="slack">Slack</MenuItem>
              <MenuItem value="mattermost">Mattermost</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>LLM Provider</InputLabel>
            <Select
              value={llmProvider}
              label="LLM Provider"
              onChange={(e) => setLlmProvider(e.target.value)}
            >
              <MenuItem value="openai">OpenAI</MenuItem>
              <MenuItem value="flowise">Flowise</MenuItem>
              <MenuItem value="openwebui">OpenWebUI</MenuItem>
            </Select>
          </FormControl>

          {messageProvider === 'discord' && (
            <TextField
              margin="dense"
              label="Discord Bot Token"
              fullWidth
              variant="outlined"
              type="password"
              value={discordToken}
              onChange={(e) => setDiscordToken(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}

          {llmProvider === 'openai' && (
            <TextField
              margin="dense"
              label="OpenAI API Key"
              fullWidth
              variant="outlined"
              type="password"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateDialogOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateBot}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clone Bot Dialog */}
      <Dialog
        open={cloneDialogOpen}
        onClose={() => {
          setCloneDialogOpen(false);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Clone Bot</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Clone bot "{selectedBot?.name}" with a new name:
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="New Bot Name"
            fullWidth
            variant="outlined"
            value={newBotName}
            onChange={(e) => setNewBotName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCloneDialogOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCloneBot}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Cloning...' : 'Clone'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Bot Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Bot</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete bot "{selectedBot?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteBot}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BotManager;