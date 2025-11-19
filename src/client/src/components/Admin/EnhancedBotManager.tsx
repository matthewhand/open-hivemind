import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import {
  Card,
  Button,
  Input,
  Select,
  Textarea,
  Badge,
  Modal,
  Checkbox,
  Loading,
  Alert,
  ToastNotification
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
  const [deletingBot, setDeletingBot] = useState<Bot | null>(null);

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
      setDeletingBot(null);
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
      isActive: false,
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
    setDeletingBot(bot);
    setOpenDeleteDialog(true);
  };

  const getBotStatus = (bot: Bot) => {
    const hasMessageProvider = bot.messageProvider;
    const hasLlmProvider = bot.llmProvider;
    const hasOverrides = bot.envOverrides && Object.keys(bot.envOverrides).length > 0;

    if (!hasMessageProvider || !hasLlmProvider) {
      return { status: 'incomplete', color: 'error', icon: <XCircleIcon className="w-5 h-5" /> };
    }
    if (hasOverrides) {
      return { status: 'env-override', color: 'warning', icon: <ExclamationTriangleIcon className="w-5 h-5" /> };
    }
    if (bot.isActive) {
      return { status: 'active', color: 'success', icon: <CheckCircleIcon className="w-5 h-5" /> };
    }
    return { status: 'inactive', color: 'ghost', icon: <XCircleIcon className="w-5 h-5" /> };
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
          <input
            type="text"
            className="input input-bordered w-full"
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
          <select
            className="select select-bordered w-full"
            value={botForm.messageProvider}
            onChange={(e) => setBotForm({ ...botForm, messageProvider: e.target.value })}
            required
          >
            <option value="">Select message provider</option>
            {providers.messageProviders.map((provider) => (
              <option key={provider.id} value={provider.id}>{provider.name}</option>
            ))}
          </select>
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">LLM Provider *</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={botForm.llmProvider}
            onChange={(e) => setBotForm({ ...botForm, llmProvider: e.target.value })}
            required
          >
            <option value="">Select LLM provider</option>
            {providers.llmProviders.map((provider) => (
              <option key={provider.id} value={provider.id}>{provider.name}</option>
            ))}
          </select>
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Persona</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={botForm.persona || 'default'}
            onChange={(e) => setBotForm({ ...botForm, persona: e.target.value })}
          >
            <option value="default">Default</option>
            {personas.map((persona) => (
              <option key={persona.key} value={persona.key}>{persona.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">System Instruction (optional)</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full"
          value={botForm.systemInstruction}
          onChange={(e) => setBotForm({ ...botForm, systemInstruction: e.target.value })}
          placeholder="Custom instructions to override or extend the persona"
          rows={3}
        />
        <label className="label">
          <span className="label-text-alt">Custom instructions that override or extend the selected persona</span>
        </label>
      </div>

      <div className="form-control">
        <label className="label cursor-pointer">
          <span className="label-text">Enable MCP Tool Guard</span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={botForm.mcpGuard?.enabled || false}
            onChange={(e) => setBotForm({
              ...botForm,
              mcpGuard: { ...botForm.mcpGuard!, enabled: e.target.checked }
            })}
          />
        </label>
      </div>

      <div className="form-control">
        <label className="label cursor-pointer">
          <span className="label-text">Activate bot immediately</span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={botForm.isActive || false}
            onChange={(e) => setBotForm({ ...botForm, isActive: e.target.checked })}
          />
        </label>
      </div>
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
            variant="ghost"
            startIcon={<ArrowPathIcon className="w-5 h-5" />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            startIcon={<PlusIcon className="w-5 h-5" />}
            onClick={openCreateForm}
          >
            Create Bot
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="Search bots by name, message provider, or LLM provider..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="w-full bg-base-200 rounded h-1 mb-4 overflow-hidden">
          <div className="h-full bg-primary animate-pulse w-1/3"></div>
        </div>
      )}

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
                        className="btn btn-ghost btn-sm btn-circle"
                        onClick={() => handleToggleExpanded(bot.id)}
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="w-4 h-4" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`text-${status.color}`}>{status.icon}</span>
                        <span className="font-medium">{bot.name}</span>
                      </div>
                    </td>
                    <td>
                      <Badge color="primary">{bot.messageProvider}</Badge>
                    </td>
                    <td>
                      <Badge color="secondary">{bot.llmProvider}</Badge>
                    </td>
                    <td>
                      <Badge color={status.color}>{status.status}</Badge>
                    </td>
                    <td>{bot.persona || 'default'}</td>
                    <td>
                      {bot.mcpServers.length > 0 ? (
                        <Badge color="info">{bot.mcpServers.length} servers</Badge>
                      ) : (
                        <span className="text-base-content/50">None</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          className="btn btn-ghost btn-sm btn-circle"
                          onClick={() => onBotSelect?.(bot)}
                          title="View Details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-circle"
                          onClick={() => openEditForm(bot)}
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-circle"
                          onClick={() => handleDuplicateBot(bot)}
                          title="Duplicate"
                        >
                          <DocumentDuplicateIcon className="w-4 h-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-circle text-error"
                          onClick={() => openDeleteConfirmation(bot)}
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} className="bg-base-200 p-4">
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
                                  <Badge key={index}>{server}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {bot.envOverrides && Object.keys(bot.envOverrides).length > 0 && (
                            <div className="md:col-span-2">
                              <Alert type="warning">
                                <ExclamationTriangleIcon className="w-5 h-5" />
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
                      </td>
                    </tr>
                  )}
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
        isOpen={openCreateDialog || openEditDialog}
        onClose={() => {
          setOpenCreateDialog(false);
          setOpenEditDialog(false);
          setEditingBot(null);
        }}
        title={openEditDialog ? 'Edit Bot' : 'Create New Bot'}
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
            {loading ? <Loading /> : (openEditDialog ? 'Update Bot' : 'Create Bot')}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={openDeleteDialog}
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
            {loading ? <Loading /> : 'Delete'}
          </Button>
        </div>
      </Modal>

      {/* Toast Notifications */}
      {success && (
        <ToastNotification
          message={success}
          type="success"
          onClose={() => setSuccess(null)}
        />
      )}

      {error && (
        <ToastNotification
          message={error}
          type="error"
          onClose={() => setError(null)}
        />
      )}
    </div>
  );
};

export default EnhancedBotManager;