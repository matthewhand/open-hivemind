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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Toolbar,
  alpha,
  Collapse,
  LinearProgress,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as ViewIcon,
  FileCopy as CopyIcon
} from '@mui/icons-material';
import { green, red, orange, grey } from '@mui/material/colors';
import { botDataProvider, Bot, CreateBotRequest } from '../../services/botDataProvider';

interface EnhancedBotManagerProps {
  onBotSelect?: (bot: Bot) => void;
}

const EnhancedBotManager: React.FC<EnhancedBotManagerProps> = ({ onBotSelect }) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof Bot>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');
  const [expandedBots, setExpandedBots] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deletingBot, setBotToDelete] = useState<Bot | null>(null);
  
  // Form state
  const [botForm, setBotForm] = useState<CreateBotRequest>({
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
  
  // Options state
  const [providers, setProviders] = useState<{
    messageProviders: any[];
    llmProviders: any[];
  }>({ messageProviders: [], llmProviders: [] });
  const [personas, setPersonas] = useState<any[]>([]);
  const [mcpServers, setMcpServers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    loadOptions();
  }, [page, rowsPerPage, orderBy, order, filterText]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await botDataProvider.getList({
        pagination: { page: page + 1, perPage: rowsPerPage },
        sort: { field: orderBy, order: order.toUpperCase() as 'ASC' | 'DESC' },
        filter: filterText ? { name: filterText } : undefined
      });
      setBots(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bots');
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [providersData, personasData, mcpData] = await Promise.all([
        botDataProvider.getProviders(),
        botDataProvider.getPersonas(),
        botDataProvider.getMCPServers()
      ]);
      setProviders(providersData);
      setPersonas(personasData);
      setMcpServers(mcpData);
    } catch (err) {
      console.error('Error loading options:', err);
    }
  };

  const handleCreateBot = async () => {
    try {
      setLoading(true);
      const validation = await botDataProvider.validate(botForm);
      
      if (!validation.isValid) {
        setError(`Configuration invalid: ${validation.errors.join(', ')}`);
        return;
      }

      await botDataProvider.create(botForm);
      setSuccess('Bot created successfully');
      setOpenCreateDialog(false);
      resetForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bot');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBot = async () => {
    if (!editingBot) return;
    
    try {
      setLoading(true);
      await botDataProvider.update(editingBot.id, botForm);
      setSuccess('Bot updated successfully');
      setOpenEditDialog(false);
      setEditingBot(null);
      resetForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bot');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBot = async () => {
    if (!deletingBot) return;
    
    try {
      setLoading(true);
      await botDataProvider.delete(deletingBot.id);
      setSuccess('Bot deleted successfully');
      setOpenDeleteDialog(false);
      setBotToDelete(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bot');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateBot = async (bot: Bot) => {
    const duplicatedBot: CreateBotRequest = {
      name: `${bot.name} (Copy)`,
      messageProvider: bot.messageProvider,
      llmProvider: bot.llmProvider,
      persona: bot.persona,
      systemInstruction: bot.systemInstruction,
      mcpServers: bot.mcpServers,
      mcpGuard: bot.mcpGuard,
      isActive: false // Start duplicated bots as inactive
    };
    
    try {
      await botDataProvider.create(duplicatedBot);
      setSuccess('Bot duplicated successfully');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate bot');
    }
  };

  const resetForm = () => {
    setBotForm({
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
  };

  const openCreateForm = () => {
    resetForm();
    setOpenCreateDialog(true);
  };

  const openEditForm = (bot: Bot) => {
    setBotForm({
      name: bot.name,
      messageProvider: bot.messageProvider,
      llmProvider: bot.llmProvider,
      persona: bot.persona,
      systemInstruction: bot.systemInstruction,
      mcpServers: bot.mcpServers,
      mcpGuard: bot.mcpGuard,
      isActive: bot.isActive
    });
    setEditingBot(bot);
    setOpenEditDialog(true);
  };

  const openDeleteConfirmation = (bot: Bot) => {
    setBotToDelete(bot);
    setOpenDeleteDialog(true);
  };

  const getBotStatus = (bot: Bot) => {
    const hasMessageProvider = bot.messageProvider;
    const hasLlmProvider = bot.llmProvider;
    const hasOverrides = bot.envOverrides && Object.keys(bot.envOverrides).length > 0;

    if (!hasMessageProvider || !hasLlmProvider) {
      return { status: 'incomplete', color: red[500], icon: <CancelIcon /> };
    }
    if (hasOverrides) {
      return { status: 'env-override', color: orange[500], icon: <WarningIcon /> };
    }
    if (bot.isActive) {
      return { status: 'active', color: green[500], icon: <CheckIcon /> };
    }
    return { status: 'inactive', color: grey[500], icon: <CancelIcon /> };
  };

  const filteredBots = bots.filter(bot =>
    bot.name.toLowerCase().includes(filterText.toLowerCase()) ||
    bot.messageProvider.toLowerCase().includes(filterText.toLowerCase()) ||
    bot.llmProvider.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleToggleExpanded = (botId: string) => {
    const newExpanded = new Set(expandedBots);
    if (newExpanded.has(botId)) {
      newExpanded.delete(botId);
    } else {
      newExpanded.add(botId);
    }
    setExpandedBots(newExpanded);
  };

  const isFormValid = () => {
    return botForm.name && botForm.messageProvider && botForm.llmProvider;
  };

  const renderBotForm = (isEdit = false) => (
    <DialogContent>
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Bot Name"
            value={botForm.name}
            onChange={(e) => setBotForm({ ...botForm, name: e.target.value })}
            required
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Message Provider</InputLabel>
            <Select
              value={botForm.messageProvider}
              label="Message Provider"
              onChange={(e) => setBotForm({ ...botForm, messageProvider: e.target.value })}
            >
              {providers.messageProviders.map((provider) => (
                <MenuItem key={provider.id} value={provider.id}>
                  {provider.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>LLM Provider</InputLabel>
            <Select
              value={botForm.llmProvider}
              label="LLM Provider"
              onChange={(e) => setBotForm({ ...botForm, llmProvider: e.target.value })}
            >
              {providers.llmProviders.map((provider) => (
                <MenuItem key={provider.id} value={provider.id}>
                  {provider.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Persona</InputLabel>
            <Select
              value={botForm.persona || 'default'}
              label="Persona"
              onChange={(e) => setBotForm({ ...botForm, persona: e.target.value })}
            >
              {personas.map((persona) => (
                <MenuItem key={persona.key} value={persona.key}>
                  {persona.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="System Instruction (optional)"
            value={botForm.systemInstruction}
            onChange={(e) => setBotForm({ ...botForm, systemInstruction: e.target.value })}
            helperText="Custom instructions to override or extend the persona"
          />
        </Grid>

        <Grid item xs={12}>
          <Autocomplete
            multiple
            options={mcpServers.map(s => s.name || s)}
            value={botForm.mcpServers || []}
            onChange={(_, newValue) => setBotForm({ ...botForm, mcpServers: newValue })}
            renderInput={(params) => (
              <TextField
                {...params}
                label="MCP Servers"
                helperText="Select MCP servers for this bot"
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={botForm.mcpGuard?.enabled || false}
                onChange={(e) => setBotForm({
                  ...botForm,
                  mcpGuard: { ...botForm.mcpGuard!, enabled: e.target.checked }
                })}
              />
            }
            label="Enable MCP Tool Guard"
          />
        </Grid>

        {botForm.mcpGuard?.enabled && (
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Guard Type</InputLabel>
              <Select
                value={botForm.mcpGuard.type}
                label="Guard Type"
                onChange={(e) => setBotForm({
                  ...botForm,
                  mcpGuard: { ...botForm.mcpGuard, type: e.target.value as 'owner' | 'custom' }
                })}
              >
                <MenuItem value="owner">Message Server Owner Only</MenuItem>
                <MenuItem value="custom">Custom User List</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={botForm.isActive || false}
                onChange={(e) => setBotForm({ ...botForm, isActive: e.target.checked })}
              />
            }
            label="Activate bot immediately"
          />
        </Grid>
      </Grid>
    </DialogContent>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Bot Management
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateForm}
          >
            Create Bot
          </Button>
        </Box>
      </Box>

      {/* Filter */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search bots by name, message provider, or LLM provider..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </Box>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Bot Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Name</TableCell>
              <TableCell>Message Provider</TableCell>
              <TableCell>LLM Provider</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Persona</TableCell>
              <TableCell>MCP Servers</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBots.map((bot) => {
              const status = getBotStatus(bot);
              const isExpanded = expandedBots.has(bot.id);
              
              return (
                <React.Fragment key={bot.id}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleExpanded(bot.id)}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {status.icon}
                        <Typography variant="body2">{bot.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={bot.messageProvider} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={bot.llmProvider} size="small" color="secondary" />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={status.status} 
                        size="small" 
                        style={{ color: status.color }}
                      />
                    </TableCell>
                    <TableCell>{bot.persona || 'default'}</TableCell>
                    <TableCell>
                      {bot.mcpServers.length > 0 ? (
                        <Chip label={`${bot.mcpServers.length} servers`} size="small" />
                      ) : (
                        <Typography variant="body2" color="text.secondary">None</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => onBotSelect?.(bot)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEditForm(bot)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicate">
                        <IconButton size="small" onClick={() => handleDuplicateBot(bot)}>
                          <CopyIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => openDeleteConfirmation(bot)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Row */}
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                          <Typography variant="h6" gutterBottom component="div">
                            Bot Details
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2">System Instruction:</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {bot.systemInstruction || 'None'}
                              </Typography>
                            </Grid>
                            {bot.mcpServers.length > 0 && (
                              <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2">MCP Servers:</Typography>
                                <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                                  {bot.mcpServers.map((server, index) => (
                                    <Chip key={index} label={server} size="small" />
                                  ))}
                                </Box>
                              </Grid>
                            )}
                            {bot.envOverrides && Object.keys(bot.envOverrides).length > 0 && (
                              <Grid item xs={12}>
                                <Alert severity="warning">
                                  Environment overrides active: {Object.keys(bot.envOverrides).join(', ')}
                                </Alert>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredBots.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Bot</DialogTitle>
        {renderBotForm()}
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateBot} 
            variant="contained"
            disabled={!isFormValid() || loading}
          >
            Create Bot
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Bot</DialogTitle>
        {renderBotForm(true)}
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleEditBot} 
            variant="contained"
            disabled={!isFormValid() || loading}
          >
            Update Bot
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the bot "{deletingBot?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteBot} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbars */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!success} 
        autoHideDuration={4000} 
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EnhancedBotManager;