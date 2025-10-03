import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
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
  Chip,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
  Snackbar,
  Alert,
  Checkbox,
  FormControlLabel,
  useTheme,
  useMediaQuery,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  ContentCopy as CloneIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  SelectAll as SelectAllIcon,
  CheckCircle as OnlineIcon,
  Error as ErrorIcon,
  HourglassEmpty as StartingIcon,
  Sync as ProcessingIcon,
} from '@mui/icons-material';
import {
  useGetConfigQuery,
  useCreateBotMutation,
  useCloneBotMutation,
  useDeleteBotMutation,
} from '../store/slices/apiSlice';

/**
 * NOTE: Backend bot object currently only exposes: name, messageProvider, llmProvider (observed from config usage).
 * This UI adds optional fields (status, lastActivity, configPreview) defensively.
 * If backend later supplies them, UI will render richer information automatically.
 */
interface UIBot {
  name: string;
  messageProvider: string;
  llmProvider: string;
  status?: 'online' | 'offline' | 'error' | 'starting' | 'processing';
  lastActivity?: string; // ISO string
  config?: Record<string, unknown>;
}

type ToastSeverity = 'success' | 'error' | 'info' | 'warning';
interface Toast {
  id: string;
  message: string;
  severity: ToastSeverity;
  persist?: boolean;
}

const STATUS_COLORS: Record<NonNullable<UIBot['status']>, { color: 'success' | 'default' | 'error' | 'warning'; label: string; icon: React.ReactNode }> = {
  online: { color: 'success', label: 'Online', icon: <OnlineIcon fontSize="small" /> },
  offline: { color: 'default', label: 'Offline', icon: null },
  error: { color: 'error', label: 'Error', icon: <ErrorIcon fontSize="small" /> },
  starting: { color: 'warning', label: 'Starting', icon: <StartingIcon fontSize="small" /> },
  processing: { color: 'warning', label: 'Processing', icon: <ProcessingIcon fontSize="small" /> },
};

const BotManager: React.FC = () => {
  /* --------------------------- Data / API Hooks --------------------------- */
  const { data, isLoading, isFetching, refetch } = useGetConfigQuery();
  const [createBot, { isLoading: isCreating }] = useCreateBotMutation();
  const [cloneBot, { isLoading: isCloning }] = useCloneBotMutation();
  const [deleteBot, { isLoading: isDeleting }] = useDeleteBotMutation();

  const rawBots: UIBot[] = useMemo(() => (data?.bots ?? []) as UIBot[], [data]);

  /* ------------------------------ UI State -------------------------------- */
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkCloneDialogOpen, setBulkCloneDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const [selectedBotName, setSelectedBotName] = useState<string | null>(null);
  const [selectedBots, setSelectedBots] = useState<Set<string>>(new Set());

  // Form states
  const [botName, setBotName] = useState('');
  const [messageProvider, setMessageProvider] = useState('discord');
  const [llmProvider, setLlmProvider] = useState('openai');
  const [discordToken, setDiscordToken] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [newBotName, setNewBotName] = useState('');

  // Bulk clone
  const [bulkClonePrefix, setBulkClonePrefix] = useState('');
  const [bulkCloneSuffix, setBulkCloneSuffix] = useState('_copy');

  // Filtering / search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMessageProvider, setFilterMessageProvider] = useState<string>('all');
  const [filterLlmProvider, setFilterLlmProvider] = useState<string>('all');

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Toast queue
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeToast, setActiveToast] = useState<Toast | null>(null);

  // Refs
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Theming / responsive
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const mutationInFlight = isCreating || isCloning || isDeleting;

  const selectedBot = useMemo(
    () => rawBots.find(bot => bot.name === selectedBotName) ?? null,
    [rawBots, selectedBotName]
  );

  /* ------------------------------ Toast Logic ----------------------------- */
  const pushToast = useCallback((message: string, severity: ToastSeverity = 'info', persist = false) => {
    const toast: Toast = { id: `${Date.now()}-${Math.random()}`, message, severity, persist };
    setToasts(prev => [...prev, toast]);
  }, []);

  useEffect(() => {
    if (!activeToast && toasts.length > 0) {
      setActiveToast(toasts[0]);
      setToasts(prev => prev.slice(1));
    }
  }, [activeToast, toasts]);

  const handleToastClose = () => {
    setActiveToast(null);
  };

  /* --------------------------- Utility Functions -------------------------- */
  const resetForm = () => {
    setBotName('');
    setMessageProvider('discord');
    setLlmProvider('openai');
    setDiscordToken('');
    setOpenaiApiKey('');
    setNewBotName('');
    setError(null);
    setSuccess(null);
    setSelectedBotName(null);
  };

  const toggleSelection = (name: string) => {
    setSelectedBots(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedBots(new Set(filteredBots.map(b => b.name)));
  };

  const clearSelection = () => {
    setSelectedBots(new Set());
  };

  // Derive filtered / searched bots
  const filteredBots = useMemo(() => {
    return rawBots
      .filter(bot =>
        searchQuery.trim() === '' ||
        bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.messageProvider?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.llmProvider?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter(bot => filterStatus === 'all' || bot.status === filterStatus)
      .filter(bot => filterMessageProvider === 'all' || bot.messageProvider === filterMessageProvider)
      .filter(bot => filterLlmProvider === 'all' || bot.llmProvider === filterLlmProvider);
  }, [rawBots, searchQuery, filterStatus, filterMessageProvider, filterLlmProvider]);

  /* ------------------------------- Handlers ------------------------------- */
  const handleCreateBot = async () => {
    if (!botName.trim()) {
      setError('Bot name is required');
      pushToast('Bot name is required', 'error');
      return;
    }

    setError(null);
    try {
      const config: Record<string, unknown> = {};

      if (messageProvider === 'discord' && discordToken.trim()) {
        config.discord = { token: discordToken.trim() };
      }
      if (llmProvider === 'openai' && openaiApiKey.trim()) {
        config.openai = { apiKey: openaiApiKey.trim() };
      }

      await createBot({
        name: botName.trim(),
        messageProvider,
        llmProvider,
        config,
      }).unwrap();

      const msg = `Bot '${botName}' created`;
      setSuccess(msg);
      pushToast(msg, 'success');
      setCreateDialogOpen(false);
      resetForm();
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create bot';
      setError(message);
      pushToast(message, 'error', true);
    }
  };

  const handleCloneBot = async () => {
    if (!selectedBot || !newBotName.trim()) {
      setError('New bot name is required');
      pushToast('New bot name is required', 'error');
      return;
    }
    setError(null);
    try {
      await cloneBot({ name: selectedBot.name, newName: newBotName.trim() }).unwrap();
      const msg = `Bot '${selectedBot.name}' cloned as '${newBotName}'`;
      setSuccess(msg);
      pushToast(msg, 'success');
      setCloneDialogOpen(false);
      resetForm();
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clone bot';
      setError(message);
      pushToast(message, 'error', true);
    }
  };

  const handleDeleteBot = async () => {
    if (!selectedBot) return;
    setError(null);
    try {
      await deleteBot(selectedBot.name).unwrap();
      const msg = `Bot '${selectedBot.name}' deleted`;
      setSuccess(msg);
      pushToast(msg, 'success');
      setDeleteDialogOpen(false);
      setSelectedBotName(null);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete bot';
      setError(message);
      pushToast(message, 'error', true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBots.size === 0) return;
    setError(null);
    let successCount = 0;
    for (const name of selectedBots) {
      try {
        await deleteBot(name).unwrap();
        successCount++;
      } catch {
        pushToast(`Failed to delete ${name}`, 'error');
      }
    }
    pushToast(`Deleted ${successCount} bot(s)`, 'success');
    setBulkDeleteDialogOpen(false);
    clearSelection();
    await refetch();
  };

  const handleBulkClone = async () => {
    if (selectedBots.size === 0) return;
    let successCount = 0;
    for (const name of selectedBots) {
      const newNameComputed = `${bulkClonePrefix}${name}${bulkCloneSuffix}`.trim();
      if (!newNameComputed || newNameComputed === name) {
        pushToast(`Skip clone of ${name}: invalid new name`, 'warning');
        continue;
      }
      try {
        await cloneBot({ name, newName: newNameComputed }).unwrap();
        successCount++;
      } catch {
        pushToast(`Failed to clone ${name}`, 'error');
      }
    }
    pushToast(`Cloned ${successCount} bot(s)`, 'success');
    setBulkCloneDialogOpen(false);
    clearSelection();
    await refetch();
  };

  const openCloneDialog = (name: string) => {
    setSelectedBotName(name);
    setNewBotName(`${name}_copy`);
    setCloneDialogOpen(true);
  };

  const openDeleteDialog = (name: string) => {
    setSelectedBotName(name);
    setDeleteDialogOpen(true);
  };

  /* --------------------------- Keyboard Shortcuts ------------------------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Focus search
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Select all
      if (e.key.toLowerCase() === 'a' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        selectAll();
      }
      // Delete selected
      if (e.key === 'Delete' || (e.key.toLowerCase() === 'd' && e.shiftKey)) {
        if (selectedBots.size > 0) {
          e.preventDefault();
          setBulkDeleteDialogOpen(true);
        }
      }
      // Clear selection
      if (e.key === 'Escape') {
        clearSelection();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedBots]);

  /* ------------------------------ Render Bits ----------------------------- */
  const renderStatusChip = (bot: UIBot) => {
    const status = bot.status ?? 'offline'; // default fallback
    const meta = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.offline;
    const showProgress = status === 'starting' || status === 'processing';
    return (
      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={1}>
        <Chip
          icon={meta.icon}
          label={meta.label}
          size="small"
          color={meta.color}
          variant={status === 'offline' ? 'outlined' : 'filled'}
        />
        {showProgress && (
          <CircularProgress size={14} thickness={5} />
        )}
      </Box>
    );
  };

  const renderConfigPreview = (bot: UIBot) => {
    const preview: string[] = [];
    if (bot.messageProvider) preview.push(`Msg:${bot.messageProvider}`);
    if (bot.llmProvider) preview.push(`LLM:${bot.llmProvider}`);
    if (bot.config && Object.keys(bot.config).length > 0) {
      const keys = Object.keys(bot.config).slice(0, 3).join(',');
      preview.push(`cfg(${keys})`);
    }
    return (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: .5 }} noWrap title={preview.join(' • ')}>
        {preview.join(' • ')}
      </Typography>
    );
  };

  const renderLastActivity = (bot: UIBot) => {
    if (!bot.lastActivity) return null;
    try {
      const date = new Date(bot.lastActivity);
      return (
        <Typography variant="caption" color="text.secondary">
          Last: {date.toLocaleString()}
        </Typography>
      );
    } catch {
      return null;
    }
  };

  /* --------------------------------- JSX ---------------------------------- */
  return (
    <Box>
      {/* Header / Actions */}
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} mb={3} gap={2}>
        <Typography variant="h5" component="h2">
          Bot Instance Manager
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          {(isFetching || (isLoading && rawBots.length > 0)) && <CircularProgress size={20} />}
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => {
              // Simple refetch as "refresh"
              refetch();
              pushToast('Configuration refreshed', 'info');
            }}
          >
            Refresh
          </Button>
          {selectedBots.size > 0 && (
            <Button
              color="warning"
              variant="outlined"
              startIcon={<CloneIcon />}
              onClick={() => setBulkCloneDialogOpen(true)}
              disabled={mutationInFlight}
            >
              Clone Selected ({selectedBots.size})
            </Button>
          )}
          {selectedBots.size > 0 && (
            <Button
              color="error"
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={() => setBulkDeleteDialogOpen(true)}
              disabled={mutationInFlight}
            >
              Delete Selected ({selectedBots.size})
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Bot
          </Button>
        </Stack>
      </Box>

      {/* Search / Filters */}
      <Card sx={{ mb: 3 }} variant="outlined">
        <CardContent sx={{ pt: 2, pb: isMobile ? 2 : 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2}>
            <Box flex={2} display="flex" alignItems="center" gap={1}>
              <SearchIcon fontSize="small" />
              <TextField
                inputRef={searchInputRef}
                placeholder="Search bots (/ to focus)"
                size="small"
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Box>
            <Box flex={3} display="flex" gap={1} flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="online">Online</MenuItem>
                  <MenuItem value="offline">Offline</MenuItem>
                  <MenuItem value="starting">Starting</MenuItem>
                  <MenuItem value="processing">Processing</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Message</InputLabel>
                <Select
                  label="Message"
                  value={filterMessageProvider}
                  onChange={(e) => setFilterMessageProvider(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="discord">Discord</MenuItem>
                  <MenuItem value="slack">Slack</MenuItem>
                  <MenuItem value="mattermost">Mattermost</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>LLM</InputLabel>
                <Select
                  label="LLM"
                  value={filterLlmProvider}
                  onChange={(e) => setFilterLlmProvider(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="openai">OpenAI</MenuItem>
                  <MenuItem value="flowise">Flowise</MenuItem>
                  <MenuItem value="openwebui">OpenWebUI</MenuItem>
                </Select>
              </FormControl>
              <Tooltip title="Select All">
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => selectAll()}
                    disabled={filteredBots.length === 0}
                  >
                    <SelectAllIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              {selectedBots.size > 0 && (
                <Button size="small" onClick={clearSelection}>Clear Selection</Button>
              )}
            </Box>
          </Box>
          <Divider />
          <Typography variant="caption" color="text.secondary">
            Keyboard: / focus search • Ctrl+A select all • Delete bulk delete • Esc clear selection
          </Typography>
        </CardContent>
      </Card>

      {/* Inline Alerts (non-intrusive; toasts handle ephemeral) */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Empty states / loading */}
      {isLoading && rawBots.length === 0 ? (
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ py: 6 }}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">
            Loading bots...
          </Typography>
        </Stack>
      ) : filteredBots.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {rawBots.length === 0
            ? 'No bots configured yet. Use the Create Bot button to get started.'
            : 'No bots match your filters / search.'}
        </Alert>
      ) : (
        <Box
          display="grid"
          gap={2}
          sx={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          }}
        >
          {filteredBots.map((bot) => {
            const isSelected = selectedBots.has(bot.name);
            return (
              <Card
                key={bot.name}
                variant={isSelected ? 'outlined' : 'elevation'}
                sx={{
                  position: 'relative',
                  borderColor: isSelected ? theme.palette.primary.main : undefined,
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: theme.shadows[4],
                  },
                  cursor: 'pointer',
                  pb: 0.5
                }}
                onClick={(e) => {
                  // Only toggle selection if clicking directly on card (not on buttons/inputs)
                  if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'DIV') {
                    if ((e.metaKey || e.ctrlKey) || e.shiftKey) {
                      toggleSelection(bot.name);
                    }
                  }
                }}
              >
                {(mutationInFlight) && (
                  <LinearProgress
                    color="secondary"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      borderTopLeftRadius: theme.shape.borderRadius,
                      borderTopRightRadius: theme.shape.borderRadius
                    }}
                  />
                )}
                <CardContent sx={{ pt: 2, pb: 1.5 }}>
                  <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1}>
                    <Box display="flex" alignItems="center" gap={1} minWidth={0}>
                      <Typography variant="h6" component="h3" noWrap title={bot.name}>
                        🤖 {bot.name}
                      </Typography>
                    </Box>
                    <Checkbox
                      size="small"
                      edge="start"
                      checked={isSelected}
                      onChange={() => toggleSelection(bot.name)}
                      inputProps={{ 'aria-label': `select bot ${bot.name}` }}
                      sx={{ ml: 0.5 }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Box>

                  {renderStatusChip(bot)}

                  <Box mb={1} display="flex" flexWrap="wrap" gap={0.5}>
                    <Chip
                      label={bot.messageProvider}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                    <Chip
                      label={bot.llmProvider}
                      size="small"
                      variant="outlined"
                      color="secondary"
                    />
                  </Box>

                  {renderConfigPreview(bot)}
                  {renderLastActivity(bot)}
                </CardContent>

                <CardActions sx={{ pt: 0, pb: 1, pl: 1, pr: 1 }}>
                  <Tooltip title="Clone Bot">
                    <span>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCloneDialog(bot.name);
                        }}
                        color="primary"
                      >
                        <CloneIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Delete Bot">
                    <span>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteDialog(bot.name);
                        }}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}

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
              label="Message Provider"
              value={messageProvider}
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
              label="LLM Provider"
              value={llmProvider}
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
              label="Discord Token"
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
          <Button onClick={handleCreateBot} variant="contained" disabled={isCreating}>
            Create
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
            Cloning bot: <strong>{selectedBot?.name}</strong>
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
          <Button onClick={handleCloneBot} variant="contained" disabled={isCloning}>
            Clone
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Bot Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Bot</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete <strong>{selectedBot?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleDeleteBot} variant="contained" color="error" disabled={isDeleting}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog
        open={bulkDeleteDialogOpen}
        onClose={() => {
          setBulkDeleteDialogOpen(false);
          clearSelection();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Selected Bots</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Are you sure you want to delete <strong>{selectedBots.size}</strong> bot(s)? This action cannot be undone.
          </Typography>
          <Box component="ul" sx={{ pl: 3, mt: 1, mb: 0, maxHeight: 200, overflow: 'auto' }}>
            {Array.from(selectedBots).map(name => (
              <Typography component="li" key={name} variant="body2">
                {name}
              </Typography>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setBulkDeleteDialogOpen(false);
              clearSelection();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleBulkDelete} variant="contained" color="error" disabled={isDeleting}>
            Delete {selectedBots.size} Bot(s)
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Clone Dialog */}
      <Dialog
        open={bulkCloneDialogOpen}
        onClose={() => {
          setBulkCloneDialogOpen(false);
          clearSelection();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Clone Selected Bots</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Cloning <strong>{selectedBots.size}</strong> bot(s). Configure naming pattern:
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Prefix (optional)"
              fullWidth
              variant="outlined"
              value={bulkClonePrefix}
              onChange={(e) => setBulkClonePrefix(e.target.value)}
              placeholder="e.g., test_"
            />
            <TextField
              label="Suffix (optional)"
              fullWidth
              variant="outlined"
              value={bulkCloneSuffix}
              onChange={(e) => setBulkCloneSuffix(e.target.value)}
              placeholder="e.g., _copy"
            />
            <FormControlLabel
              control={<Checkbox
                checked={bulkClonePrefix === '' && bulkCloneSuffix === '_copy'}
                onChange={(e) => {
                  if (e.target.checked) {
                    setBulkClonePrefix('');
                    setBulkCloneSuffix('_copy');
                  } else {
                    setBulkClonePrefix('');
                    setBulkCloneSuffix('');
                  }
                }}
              />}
              label="Use default suffix (_copy)"
            />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Preview:
              </Typography>
              <Box component="ul" sx={{ pl: 3, mt: 0.5, mb: 0, maxHeight: 140, overflow: 'auto' }}>
                {Array.from(selectedBots).slice(0, 6).map(name => {
                  const previewName = `${bulkClonePrefix}${name}${bulkCloneSuffix}`.trim();
                  return (
                    <Typography component="li" key={name} variant="body2">
                      {name} → {previewName}
                    </Typography>
                  );
                })}
                {selectedBots.size > 6 && (
                  <Typography component="li" variant="body2" color="text.secondary">
                    ...and {selectedBots.size - 6} more
                  </Typography>
                )}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setBulkCloneDialogOpen(false);
              clearSelection();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleBulkClone} variant="contained" disabled={isCloning}>
            Clone {selectedBots.size} Bot(s)
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast notifications */}
      <Snackbar
        open={!!activeToast}
        autoHideDuration={activeToast?.persist ? null : 6000}
        onClose={handleToastClose}
      >
        <Alert
          onClose={handleToastClose}
          severity={activeToast?.severity || 'info'}
          sx={{ width: '100%' }}
        >
          {activeToast?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BotManager;