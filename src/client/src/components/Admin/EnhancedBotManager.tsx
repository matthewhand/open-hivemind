import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Collapse,
  LinearProgress,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as ViewIcon,
  FileCopy as CopyIcon
} from '@mui/icons-material';
import { green, red, orange, grey } from '@mui/material/colors';
import { 
  Card, 
  Button, 
  Input,
  Select,
  Textarea,
  Chip,
  Badge,
  Modal,
  Form,
  Checkbox,
  Loading,
  Button
} from '../DaisyUI';
import { botDataProvider, Bot, CreateBotRequest } from '../../services/botDataProvider';
import ProviderConfig from '../ProviderConfig';

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
    isActive: true,
    discord: {},
    slack: {},
    mattermost: {},
    openai: {},
    flowise: {},
    openwebui: {},
    openswarm: {},
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
      isActive: false, // Start duplicated bots as inactive
      discord: bot.discord || {},
      slack: bot.slack || {},
      mattermost: bot.mattermost || {},
      openai: bot.openai || {},
      flowise: bot.flowise || {},
      openwebui: bot.openwebui || {},
      openswarm: bot.openswarm || {},
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
      isActive: true,
      discord: {},
      slack: {},
      mattermost: {},
      openai: {},
      flowise: {},
      openwebui: {},
      openswarm: {},
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
      isActive: bot.isActive,
      discord: bot.discord || {},
      slack: bot.slack || {},
      mattermost: bot.mattermost || {},
      openai: bot.openai || {},
      flowise: bot.flowise || {},
      openwebui: bot.openwebui || {},
      openswarm: bot.openswarm || {},
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
      return { status: 'incomplete', color: red[500], icon: <CancelIcon />, badge: 'badge-error' };
    }
    if (hasOverrides) {
      return { status: 'env-override', color: orange[500], icon: <WarningIcon />, badge: 'badge-warning' };
    }
    if (bot.isActive) {
      return { status: 'active', color: green[500], icon: <CheckIcon />, badge: 'badge-success' };
    }
    return { status: 'inactive', color: grey[500], icon: <CancelIcon />, badge: 'badge-ghost' };
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Bot Name *</span>
          </label>
          <Input
            value={botForm.name}
            onChange={(e) => setBotForm({ ...botForm, name: e.target.value })}
            placeholder="Enter bot name"
            required
          />
        </div>
        
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Message Provider *</span>
          </label>
          <Select
            options={providers.messageProviders.map((provider) => ({
              value: provider.id,
              label: provider.name
            }))}
            value={botForm.messageProvider}
            onChange={(e) => setBotForm({ ...botForm, messageProvider: e.target.value })}
            placeholder="Select message provider"
          />
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">LLM Provider *</span>
          </label>
          <Select
            options={providers.llmProviders.map((provider) => ({
              value: provider.id,
              label: provider.name
            }))}
            value={botForm.llmProvider}
            onChange={(e) => setBotForm({ ...botForm, llmProvider: e.target.value })}
            placeholder="Select LLM provider"
          />
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Persona</span>
          </label>
          <Select
            options={personas.map((persona) => ({
              value: persona.key,
              label: persona.name
            }))}
            value={botForm.persona || 'default'}
            onChange={(e) => setBotForm({ ...botForm, persona: e.target.value })}
            placeholder="Select persona"
          />
        </div>
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">System Instruction (optional)</span>
        </label>
        <Textarea
          value={botForm.systemInstruction}
          onChange={(e) => setBotForm({ ...botForm, systemInstruction: e.target.value })}
          placeholder="Custom instructions to override or extend the persona"
          rows={3}
        />
        <label className="label">
          <span className="label-text-alt">Custom instructions that override or extend the selected persona</span>
        </label>
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">MCP Servers</span>
        </label>
        <Select
          options={mcpServers.map(s => ({ value: s.name || s, label: s.name || s }))}
          value={botForm.mcpServers || []}
          onChange={(e) => setBotForm({ ...botForm, mcpServers: Array.isArray(e.target.value) ? e.target.value : [e.target.value] })}
          placeholder="Select MCP servers"
          multiple
        />
        <label className="label">
          <span className="label-text-alt">Select MCP servers for this bot</span>
        </label>
      </div>

      <div className="form-control">
        <label className="label cursor-pointer">
          <span className="label-text">Enable MCP Tool Guard</span>
          <Checkbox
            checked={botForm.mcpGuard?.enabled || false}
            onChange={(e) => setBotForm({
              ...botForm,
              mcpGuard: { ...botForm.mcpGuard!, enabled: e.target.checked }
            })}
          />
        </label>
      </div>

      {botForm.mcpGuard?.enabled && (
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Guard Type</span>
          </label>
          <Select
            options={[
              { value: 'owner', label: 'Message Server Owner Only' },
              { value: 'custom', label: 'Custom User List' }
            ]}
            value={botForm.mcpGuard.type}
            onChange={(e) => setBotForm({
              ...botForm,
              mcpGuard: { ...botForm.mcpGuard, type: e.target.value as 'owner' | 'custom' }
            })}
          />
        </div>
      )}

      <div className="form-control">
        <label className="label cursor-pointer">
          <span className="label-text">Activate bot immediately</span>
          <Checkbox
            checked={botForm.isActive || false}
            onChange={(e) => setBotForm({ ...botForm, isActive: e.target.checked })}
          />
        </label>
      </div>

      {/* Provider-specific configurations */}
      {botForm.messageProvider && (
        <div className="collapse collapse-arrow bg-base-200">
          <input type="checkbox" defaultChecked />
          <div className="collapse-title text-lg font-medium">
            Message Provider Configuration
          </div>
          <div className="collapse-content">
            <ProviderConfig
              provider={botForm.messageProvider}
              config={botForm[botForm.messageProvider as keyof CreateBotRequest] || {}}
              onChange={(config) => setBotForm({ ...botForm, [botForm.messageProvider]: config })}
              envOverrides={editingBot?.envOverrides || {}}
              showSecurityIndicators={true}
            />
          </div>
        </div>
      )}

      {botForm.llmProvider && (
        <div className="collapse collapse-arrow bg-base-200">
          <input type="checkbox" defaultChecked />
          <div className="collapse-title text-lg font-medium">
            LLM Provider Configuration
          </div>
          <div className="collapse-content">
            <ProviderConfig
              provider={botForm.llmProvider}
              config={botForm[botForm.llmProvider as keyof CreateBotRequest] || {}}
              onChange={(config) => setBotForm({ ...botForm, [botForm.llmProvider]: config })}
              envOverrides={editingBot?.envOverrides || {}}
              showSecurityIndicators={true}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Bot Management</h1>
          <p className="text-base-content/70">Create, configure, and manage your bot instances</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            icon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            icon={<AddIcon />}
            onClick={openCreateForm}
          >
            Create Bot
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <Input
          placeholder="Search bots by name, message provider, or LLM provider..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Loading */}
      {loading && <LinearProgress className="mb-4" />}

      {/* Bot Table */}
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Message Provider</th>
              <th>LLM Provider</th>
              <th>Status</th>
              <th>Persona</th>
              <th>MCP Servers</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBots.map((bot) => {
              const status = getBotStatus(bot);
              const isExpanded = expandedBots.has(bot.id);
              
              return (
                <React.Fragment key={bot.id}>
                  <tr className="hover">
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleToggleExpanded(bot.id)}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {status.icon}
                        <span>{bot.name}</span>
                      </div>
                    </td>
                    <td>
                      <Chip className="chip-sm">{bot.messageProvider}</Chip>
                    </td>
                    <td>
                      <Chip className="chip-sm chip-secondary">{bot.llmProvider}</Chip>
                    </td>
                    <td>
                      <Badge className={status.badge}>{status.status}</Badge>
                    </td>
                    <td>{bot.persona || 'default'}</td>
                    <td>
                      {bot.mcpServers.length > 0 ? (
                        <Badge className="badge-info">{bot.mcpServers.length} servers</Badge>
                      ) : (
                        <span className="text-base-content/50">None</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip title="View Details">
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => onBotSelect?.(bot)}
                          >
                            <ViewIcon />
                          </button>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEditForm(bot)}
                          >
                            <EditIcon />
                          </button>
                        </Tooltip>
                        <Tooltip title="Duplicate">
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDuplicateBot(bot)}
                          >
                            <CopyIcon />
                          </button>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <button 
                            className="btn btn-ghost btn-sm btn-error"
                            onClick={() => openDeleteConfirmation(bot)}
                          >
                            <DeleteIcon />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Row */}
                  <tr>
                    <td colSpan={8} className="p-0">
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <div className="p-4 bg-base-200">
                          <h3 className="text-lg font-semibold mb-3">Bot Details</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-sm mb-1">System Instruction:</h4>
                              <p className="text-sm text-base-content/70">
                                {bot.systemInstruction || 'None'}
                              </p>
                            </div>
                            {bot.mcpServers.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-1">MCP Servers:</h4>
                                <div className="flex flex-wrap gap-1">
                                  {bot.mcpServers.map((server, index) => (
                                    <Chip key={index} className="chip-xs">{server}</Chip>
                                  ))}
                                </div>
                              </div>
                            )}
                            {bot.envOverrides && Object.keys(bot.envOverrides).length > 0 && (
                              <div className="md:col-span-2">
                                <Alert severity="warning" className="alert-warning">
                                  <WarningIcon />
                                  <div>
                                    <div className="font-bold">Environment overrides active</div>
                                    <div className="text-sm">
                                      {Object.keys(bot.envOverrides).join(', ')}
                                    </div>
                                  </div>
                                </Alert>
                              </div>
                            )}
                          </div>
                        </div>
                      </Collapse>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-base-content/70">
          Showing {filteredBots.length} bots
        </div>
        <div className="join">
          <button
            className="join-item btn btn-sm"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            Previous
          </button>
          <button className="join-item btn btn-sm">
            Page {page + 1}
          </button>
          <button
            className="join-item btn btn-sm"
            onClick={() => setPage(page + 1)}
            disabled={filteredBots.length < rowsPerPage}
          >
            Next
          </button>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal 
        open={openCreateDialog || openEditDialog}
        onClose={() => {
          setOpenCreateDialog(false);
          setOpenEditDialog(false);
          setEditingBot(null);
        }}
        title={isEdit ? 'Edit Bot' : 'Create New Bot'}
        size="lg"
      >
        <div className="modal-body">
          {renderBotForm(openEditDialog)}
        </div>
        <div className="modal-action">
          <Button
            variant="ghost"
            onClick={() => {
              setOpenCreateDialog(false);
              setOpenEditDialog(false);
              setEditingBot(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={openEditDialog ? handleEditBot : handleCreateBot}
            disabled={loading || !isFormValid()}
          >
            {loading ? <Loading size="sm" /> : (openEditDialog ? 'Update Bot' : 'Create Bot')}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="modal-body">
          <p>
            Are you sure you want to delete the bot "{deletingBot?.name}"? 
            This action cannot be undone.
          </p>
        </div>
        <div className="modal-action">
          <Button variant="ghost" onClick={() => setOpenDeleteDialog(false)}>
            Cancel
          </Button>
          <Button 
            variant="error" 
            onClick={handleDeleteBot} 
            disabled={loading}
          >
            {loading ? <Loading size="sm" /> : 'Delete'}
          </Button>
        </div>
      </Modal>

      {/* Success/Info notifications */}
      {success && (
        <div className="toast toast-top toast-end">
          <Alert severity="success" className="alert-success">
            <CheckIcon />
            <div>{success}</div>
          </Alert>
        </div>
      )}

      {error && (
        <div className="toast toast-top toast-end">
          <Alert severity="error" className="alert-error">
            <CancelIcon />
            <div>{error}</div>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default EnhancedBotManager;