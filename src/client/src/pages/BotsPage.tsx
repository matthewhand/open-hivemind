/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Activity,
  AlertCircle,
  Bot,
  Copy,
  Cpu,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Settings,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BotAvatar } from '../components/BotAvatar';
import BotChatBubbles from '../components/BotChatBubbles';
import { CreateBotWizard } from '../components/BotManagement/CreateBotWizard';
import { BotSettingsModal } from '../components/BotSettingsModal';
import EmptyState from '../components/DaisyUI/EmptyState';
import Modal from '../components/DaisyUI/Modal';
import PageHeader from '../components/DaisyUI/PageHeader';
import SearchFilterBar from '../components/SearchFilterBar';
import { PROVIDER_CATEGORIES } from '../config/providers';
import { useLlmStatus } from '../hooks/useLlmStatus';
import { usePageLifecycle } from '../hooks/usePageLifecycle';
import { apiService } from '../services/api';

/**
 * Represents the configuration and runtime state of a generic bot instance.
 */
interface BotData {
  id: string;
  name: string;
  provider: string; // Message Provider Name
  messageProvider?: string; // Alternative field from API
  llmProvider: string; // LLM Provider Name
  persona?: string; // Bot Persona
  status: string;
  connected: boolean;
  messageCount: number;
  errorCount: number;
  config?: any; // Bot specific config overrides
  envOverrides?: any;
}

const BotsPage: React.FC = () => {
  // UI State
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [previewBot, setPreviewBot] = useState<BotData | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedBotForConfig, setSelectedBotForConfig] = useState<BotData | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [logFilter, setLogFilter] = useState('');

  // Create Bot State
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get LLM status to check if system default is configured
  const { status: llmStatus } = useLlmStatus();
  const defaultLlmConfigured = llmStatus?.defaultConfigured ?? false;

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; bot: BotData | null }>({
    isOpen: false,
    bot: null,
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Clone Modal State
  const [cloneModal, setCloneModal] = useState<{ isOpen: boolean; bot: BotData | null }>({
    isOpen: false,
    bot: null,
  });
  const [cloneName, setCloneName] = useState('');

  // Define data fetching logic
  const fetchPageData = useCallback(async (_signal: AbortSignal) => {
    const [configData, globalData, personasData, profilesData] = await Promise.all([
      apiService.getConfig(),
      apiService.getGlobalConfig(),
      apiService.getPersonas(),
      apiService.getLlmProfiles(),
    ]);

    const personas = personasData || [];
    const llmProfiles = profilesData?.profiles?.llm || [];

    const globalConfig: any = {};
    if (globalData) {
      Object.keys(globalData).forEach((key) => {
        globalConfig[key] = globalData[key].values;
      });
    }

    return {
      bots: (configData.bots || []) as unknown as BotData[],
      personas,
      llmProfiles,
      globalConfig,
    };
  }, []);

  // Use Page Lifecycle Hook
  const {
    data,
    loading,
    error: lifecycleError,
    refetch,
  } = usePageLifecycle({
    title: 'Bot Management',
    fetchData: fetchPageData,
    initialData: { bots: [], personas: [], llmProfiles: [], globalConfig: {} },
  });

  // Derived state
  const bots = data?.bots || [];
  /**
   * Memoized list of bots filtered by searchQuery, preventing O(N) re-computation on every render.
   */
  const filteredBots = useMemo(() => bots.filter((bot) => {
    const q = searchQuery.toLowerCase();
    return (
      bot.name.toLowerCase().includes(q) ||
      (bot.provider || '').toLowerCase().includes(q) ||
      ((bot as any).messageProvider || '').toLowerCase().includes(q) ||
      (bot.llmProvider || '').toLowerCase().includes(q)
    );
  }), [bots, searchQuery]);
  const personas = data?.personas || [];
  const llmProfiles = data?.llmProfiles || [];
  const globalConfig = data?.globalConfig || {};

  // Sync lifecycle error to UI error
  useEffect(() => {
    if (lifecycleError) {
      setUiError(lifecycleError.message);
    }
  }, [lifecycleError]);

  const setError = setUiError;
  const error = uiError;

  // Fetch logs and chat history when previewing a bot
  useEffect(() => {
    if (previewBot) {
      // Fetch activity logs
      const fetchActivity = async () => {
        try {
          const json = await apiService.get<any>(`/api/bots/${previewBot.id}/activity?limit=20`);
          setActivityLogs(json.data?.activity || []);
        } catch (err) {
          console.error('Failed to fetch activity logs:', err);
          setActivityLogs([]);
        }
      };

      fetchActivity();

      // Fetch chat history
      const fetchChatHistory = async () => {
        setChatLoading(true);
        try {
          const json = await apiService.get<any>(`/api/bots/${previewBot.id}/history?limit=20`);
          setChatHistory(json.data?.history || []);
        } catch (err) {
          console.error('Failed to fetch chat history:', err);
          setChatHistory([]);
        } finally {
          setChatLoading(false);
        }
      };
      fetchChatHistory();
    } else {
      setActivityLogs([]);
      setChatHistory([]);
    }
  }, [previewBot]);

  const getIntegrationOptions = (category: 'llm' | 'message') => {
    const allKeys = Object.keys(globalConfig);
    const validPrefixes = PROVIDER_CATEGORIES[category] || [];

    return allKeys.filter((key) => {
      // Match exact provider name or provider-instance
      // e.g. 'openai' or 'openai-prod'
      return validPrefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}-`));
    });
  };

  const handleUpdateConfig = async (
    bot: BotData,
    field: 'llmProvider' | 'messageProvider',
    value: string
  ) => {
    try {
      setActionLoading(bot.id);
      const updates: any = {};
      if (field === 'messageProvider') {
        updates.messageProvider = value;
      }
      if (field === 'llmProvider') {
        updates.llmProvider = value;
      }

      await apiService.updateBot(bot.id, updates);
      await refetch();
    } catch (err: any) {
      alert('Error updating bot: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (bot: BotData) => {
    const action = bot.status === 'active' ? 'stop' : 'start';

    try {
      setActionLoading(bot.id);
      await apiService.post(`/api/bots/${bot.id}/${action}`);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} bot`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.bot) {
      return;
    }
    if (deleteConfirmation !== deleteModal.bot.name) {
      return;
    }

    try {
      setActionLoading(deleteModal.bot.id);
      await apiService.deleteBot(deleteModal.bot.id);

      setDeleteModal({ isOpen: false, bot: null });
      setDeleteConfirmation('');
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bot');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCloneClick = (bot: BotData) => {
    setCloneModal({ isOpen: true, bot });
    setCloneName(`${bot.name} (Copy)`);
  };

  const handleCloneSubmit = async () => {
    if (!cloneModal.bot) {
      return;
    }
    try {
      setActionLoading('clone');
      await apiService.cloneBot(cloneModal.bot.id, cloneName);
      await refetch();
      setCloneModal({ isOpen: false, bot: null });
      setCloneName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone bot');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClone = async (bot: BotData) => {
    handleCloneClick(bot);
  };

  const handleUpdatePersona = async (bot: BotData, persona: string) => {
    try {
      setActionLoading(bot.id);
      await apiService.updateBot(bot.id, { persona });
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update persona');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string, connected: boolean) => {
    if (status === 'active' && connected) {
      return (
        <span className="badge badge-success gap-1 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-green-900 animate-pulse" /> Running
        </span>
      );
    } else if (status === 'active' && !connected) {
      return <span className="badge badge-warning gap-1 text-xs font-semibold">Disconnected</span>;
    } else {
      return <span className="badge badge-ghost text-xs font-semibold opacity-50">Disabled</span>;
    }
  };

  const redact = (str: string) => {
    if (!str) {
      return '';
    }
    if (str.length <= 4) {
      return '****';
    }
    return (
      str.substring(0, 2) + '*'.repeat(Math.min(str.length - 4, 8)) + str.substring(str.length - 2)
    );
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Bot Management"
        description="Manage your AI bot instances"
        icon={Bot}
        gradient="primary"
        actions={
          <>
            <button onClick={() => refetch()} className="btn btn-ghost gap-2" disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary gap-2">
              <Plus className="w-4 h-4" /> Create Bot
            </button>
          </>
        }
      />

      {/* Stats */}
      <div className="stats stats-horizontal bg-base-200 w-full">
        <div className="stat">
          <div className="stat-title">Total Bots</div>
          <div className="stat-value text-primary">{bots.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Active</div>
          <div className="stat-value text-green-500">
            {bots.filter((b) => b.status === 'active' && b.connected).length}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Disconnected</div>
          <div className="stat-value text-yellow-500">
            {bots.filter((b) => b.status === 'active' && !b.connected).length}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Errors</div>
          <div className="stat-value text-red-500">
            {bots.reduce((sum, b) => sum + (b.errorCount || 0), 0)}
          </div>
        </div>
      </div>

      {/* Search Input */}
      {bots.length > 0 && (
        <SearchFilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search bots..."
        />
      )}

      {/* DataTable */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-0">
          {loading && bots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <span className="loading loading-bars loading-lg text-primary" />
              <p className="text-base-content/50 animate-pulse">Loading bots...</p>
            </div>
          ) : bots.length === 0 ? (
            <EmptyState
              icon={Bot}
              title="No bots configured"
              description="Create a bot configuration to get started"
              actionLabel="Create Bot"
              actionIcon={Plus}
              onAction={() => setShowCreateModal(true)}
              variant="noData"
            />
          ) : filteredBots.length === 0 ? (
            <EmptyState
              icon={Search}
              title={`No bots found matching "${searchQuery}"`}
              description="Try adjusting your search query"
              actionLabel="Clear Search"
              onAction={() => setSearchQuery('')}
              variant="noResults"
            />
          ) : (
            <div className="flex flex-col gap-2">
              {filteredBots.map((bot) => (
                <div
                  key={bot.id}
                  className="bg-base-100 border border-base-300 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <BotAvatar bot={bot} />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{bot.name}</span>
                        <div className="bg-base-200 px-2 py-0.5 rounded text-[10px] font-mono opacity-50 group-hover:opacity-100 transition-opacity">
                          {bot.id}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-base-content/60 mt-1">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 opacity-70" />
                          {(bot as any).messageProvider || bot.provider || 'No Msg'}
                        </span>
                        <span className="flex items-center gap-1 border-l border-base-content/20 pl-4">
                          <Cpu className="w-3 h-3 opacity-70" />
                          {bot.llmProvider
                            ? llmProfiles.find((p) => p.key === bot.llmProvider)?.name ||
                            bot.llmProvider
                            : 'Default LLM'}
                        </span>
                        {bot.messageCount > 0 && (
                          <span
                            className="flex items-center gap-1 border-l border-base-content/20 pl-4"
                            title="Messages Processed"
                          >
                            <Activity className="w-3 h-3 opacity-70" /> {bot.messageCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end mr-4">
                      {getStatusBadge(bot.status, bot.connected)}
                    </div>

                    {/* Toggle Status */}
                    <input
                      type="checkbox"
                      className={`toggle toggle-sm ${bot.status === 'active' ? 'toggle-success' : ''}`}
                      checked={bot.status === 'active'}
                      onChange={() => handleToggleStatus(bot)}
                      disabled={actionLoading === bot.id}
                      title="Toggle Bot Status"
                    />

                    <div className="divider divider-horizontal mx-1 h-8"></div>

                    {/* Duplicate Button */}
                    <button
                      className="btn btn-sm btn-square btn-ghost"
                      onClick={() => handleCloneClick(bot)}
                      title="Duplicate Bot"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Settings Button (Opens Modal) */}
                    <button
                      className="btn btn-sm btn-square btn-ghost"
                      onClick={() => setSelectedBotForConfig(bot)}
                      title="Bot Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bot Settings Modal */}
      {selectedBotForConfig && (
        <BotSettingsModal
          isOpen={!!selectedBotForConfig}
          onClose={() => setSelectedBotForConfig(null)}
          bot={selectedBotForConfig}
          personas={personas}
          llmProfiles={llmProfiles}
          integrationOptions={{ message: getIntegrationOptions('message') }}
          onUpdateConfig={async (bot: any, key: string, value: any) => {
            await handleUpdateConfig(bot, key as any, value);
            setSelectedBotForConfig((prev) =>
              prev ? { ...prev, [key]: value, config: { ...prev.config, [key]: value } } : null
            );
          }}
          onUpdatePersona={async (bot: any, pid: string) => {
            await handleUpdatePersona(bot, pid);
            setSelectedBotForConfig((prev) => (prev ? { ...prev, persona: pid } : null));
          }}
          onClone={(b: any) => {
            handleClone(b);
            setSelectedBotForConfig(null);
          }}
          onDelete={(b: any) => {
            setDeleteModal({ isOpen: true, bot: b });
            setDeleteConfirmation('');
            setSelectedBotForConfig(null);
          }}
          onViewDetails={(b: any) => {
            setPreviewBot(b);
            setSelectedBotForConfig(null);
          }}
        />
      )}

      {/* Create Bot Wizard Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Bot"
        size="lg"
      >
        <CreateBotWizard
          onCancel={() => setShowCreateModal(false)}
          onSuccess={async () => {
            setShowCreateModal(false);
            await refetch();
          }}
          personas={personas}
          llmProfiles={llmProfiles}
          defaultLlmConfigured={defaultLlmConfigured}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => {
          setDeleteModal({ isOpen: false, bot: null });
          setDeleteConfirmation('');
        }}
        title="Delete Bot"
        size="sm"
      >
        <div className="space-y-4">
          <p>
            Are you sure you want to delete <strong>{deleteModal.bot?.name}</strong>?
          </p>
          <p className="text-sm text-base-content/60">This action cannot be undone.</p>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">
                Type <strong>{deleteModal.bot?.name}</strong> to confirm.
              </span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder={deleteModal.bot?.name}
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              className="btn btn-ghost"
              onClick={() => {
                setDeleteModal({ isOpen: false, bot: null });
                setDeleteConfirmation('');
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-error"
              onClick={handleDelete}
              disabled={
                actionLoading === deleteModal.bot?.id ||
                deleteConfirmation !== deleteModal.bot?.name
              }
            >
              {actionLoading === deleteModal.bot?.id ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Clone Bot Modal */}
      <Modal
        isOpen={cloneModal.isOpen}
        onClose={() => {
          setCloneModal({ isOpen: false, bot: null });
          setCloneName('');
        }}
        title="Clone Bot"
        size="sm"
      >
        <div className="space-y-4">
          <p>Enter a name for the new bot.</p>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Bot Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="New Bot Name"
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCloneSubmit()}
            />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              className="btn btn-ghost"
              onClick={() => {
                setCloneModal({ isOpen: false, bot: null });
                setCloneName('');
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCloneSubmit}
              disabled={actionLoading === 'clone' || !cloneName.trim()}
            >
              {actionLoading === 'clone' ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                'Clone'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewBot}
        onClose={() => setPreviewBot(null)}
        title={previewBot?.name || 'Bot Details'}
        size="lg"
      >
        {previewBot && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content w-16 rounded-full flex items-center justify-center">
                  <Bot className="w-8 h-8" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold">{previewBot.name}</h3>
                <p className="text-base-content/60">ID: {previewBot.id}</p>
                <div className="mt-2">
                  {getStatusBadge(previewBot.status, previewBot.connected)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> Message Provider
                    </h4>
                    <button
                      className="btn btn-xs btn-ghost gap-1"
                      onClick={() => (window.location.href = '/admin/integrations/message')}
                      title="Configure Message Provider"
                    >
                      <Settings className="w-3 h-3" /> Config
                    </button>
                  </div>
                  <p className="text-lg font-bold mb-1">
                    {previewBot.messageProvider || previewBot.provider || 'None'}
                  </p>
                  {/* Display redacted config details if available */}
                  {previewBot.config && previewBot.config[previewBot.provider] && (
                    <div className="text-xs font-mono opacity-70 mt-2 p-2 bg-base-300 rounded">
                      {Object.entries(previewBot.config[previewBot.provider]).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span>{key}:</span>
                          <span>{redact(String(val))}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Cpu className="w-4 h-4" /> LLM Provider
                    </h4>
                    <button
                      className="btn btn-xs btn-ghost gap-1"
                      onClick={() => (window.location.href = '/admin/integrations/llm')}
                      title="Configure LLM Provider"
                    >
                      <Settings className="w-3 h-3" /> Config
                    </button>
                  </div>
                  <p className="text-lg font-bold mb-1">{previewBot.llmProvider || 'None'}</p>
                  {/* Display redacted config details if available */}
                  {previewBot.config && previewBot.config.llm && (
                    <div className="text-xs font-mono opacity-70 mt-2 p-2 bg-base-300 rounded">
                      {Object.entries(previewBot.config.llm).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span>{key}:</span>
                          <span>{redact(String(val))}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="stats bg-base-200 w-full shadow-sm">
              <div className="stat">
                <div className="stat-title">Messages</div>
                <div className="stat-value text-primary">{previewBot.messageCount || 0}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Errors</div>
                <div className="stat-value text-error">{previewBot.errorCount || 0}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Recent Activity
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Filter logs..."
                    className="input input-xs input-bordered w-32"
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                  />
                  <select
                    className="select select-xs select-bordered"
                    onChange={(e) => {
                      const limit = e.target.value;
                      if (previewBot) {
                        apiService
                          .get<any>(`/api/bots/${previewBot.id}/activity?limit=${limit}`)
                          .then((json) => {
                            setActivityLogs(json.data?.activity || []);
                          });
                      }
                    }}
                  >
                    <option value="20">Last 20</option>
                    <option value="50">Last 50</option>
                    <option value="100">Last 100</option>
                  </select>
                </div>
              </div>
              <div className="bg-base-300 rounded-lg p-4 h-48 overflow-y-auto font-mono text-xs">
                {activityLogs.length > 0 ? (
                  activityLogs
                    .filter(
                      (log) =>
                        !logFilter ||
                        log.action?.toLowerCase().includes(logFilter.toLowerCase()) ||
                        log.details?.toLowerCase().includes(logFilter.toLowerCase())
                    )
                    .map((log) => (
                      <div
                        key={log.id}
                        className="mb-1 border-b border-base-content/5 pb-1 last:border-0"
                      >
                        <span className="opacity-50 mr-2">
                          [{new Date(log.timestamp).toLocaleTimeString()}]
                        </span>
                        <span
                          className={
                            log.metadata?.type === 'RUNTIME'
                              ? 'text-info'
                              : log.action?.includes('ERROR') || log.result === 'failure'
                                ? 'text-error'
                                : 'text-base-content'
                          }
                        >
                          <span className="font-bold mr-1">[{log.action}]</span>
                          {log.details}
                        </span>
                      </div>
                    ))
                ) : (
                  <div className="text-center opacity-50 py-12 flex flex-col items-center">
                    <Activity className="w-8 h-8 mb-2 opacity-20" />
                    <span>No recent activity found</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Chat History
              </h4>
              <div className="bg-base-300 rounded-lg">
                <BotChatBubbles
                  messages={chatHistory}
                  botName={previewBot.name}
                  loading={chatLoading}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setPreviewBot(null)}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => (window.location.href = '/admin/integrations/llm')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure Providers
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BotsPage;
