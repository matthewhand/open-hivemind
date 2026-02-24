/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Bot, Plus, Play, Square, Trash2, Copy, MessageSquare, Cpu, Eye, AlertCircle, RefreshCw, Activity, Settings, ExternalLink, User, Edit2, Shield, Info } from 'lucide-react';

import Modal from '../components/DaisyUI/Modal';
import PageHeader from '../components/DaisyUI/PageHeader';

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

import { PROVIDER_CATEGORIES } from '../config/providers';
import { useLlmStatus } from '../hooks/useLlmStatus';
import { BotAvatar } from '../components/BotAvatar';
import BotChatBubbles from '../components/BotChatBubbles';
import { CreateBotWizard } from '../components/BotManagement/CreateBotWizard';
import { BotSettingsModal } from '../components/BotSettingsModal';
import { usePageLifecycle } from '../hooks/usePageLifecycle';

const API_BASE = '/api';

const BotsPage: React.FC = () => {
  // UI State
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [previewBot, setPreviewBot] = useState<BotData | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedBotForConfig, setSelectedBotForConfig] = useState<BotData | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);

  // Create Bot State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [newBotDesc, setNewBotDesc] = useState('');
  const [newBotMessageProvider, setNewBotMessageProvider] = useState('discord');
  const [newBotLlmProvider, setNewBotLlmProvider] = useState('');
  const [newBotPersona, setNewBotPersona] = useState('');

  const canCreateBot = newBotName.trim().length > 0 && newBotMessageProvider;

  // Get LLM status to check if system default is configured
  const { status: llmStatus } = useLlmStatus();
  const defaultLlmConfigured = llmStatus?.defaultConfigured ?? false;

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; bot: BotData | null }>({ isOpen: false, bot: null });
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Define data fetching logic
  const fetchPageData = useCallback(async (signal: AbortSignal) => {
    const [configResponse, globalResponse, personasResponse, profilesResponse] = await Promise.all([
      fetch(`${API_BASE}/config`, { signal }),
      fetch(`${API_BASE}/config/global`, { signal }),
      fetch(`${API_BASE}/personas`, { signal }),
      fetch(`${API_BASE}/config/llm-profiles`, { signal }),
    ]);

    if (!configResponse.ok) { throw new Error('Failed to fetch bot config'); }
    const configData = await configResponse.json();

    let personas = [];
    if (personasResponse.ok) {
      personas = await personasResponse.json();
    }

    let llmProfiles = [];
    if (profilesResponse.ok) {
      const profilesData = await profilesResponse.json();
      llmProfiles = profilesData.profiles?.llm || [];
    }

    let globalConfig: any = {};
    if (globalResponse.ok) {
      const globalData = await globalResponse.json();
      Object.keys(globalData).forEach(key => {
        globalConfig[key] = globalData[key].values;
      });
    }

    return {
      bots: (configData.bots || []) as BotData[],
      personas,
      llmProfiles,
      globalConfig
    };
  }, []);

  // Use Page Lifecycle Hook
  const { data, loading, error: lifecycleError, refetch } = usePageLifecycle({
    title: 'Bot Management',
    fetchData: fetchPageData,
    initialData: { bots: [], personas: [], llmProfiles: [], globalConfig: {} }
  });

  // Derived state
  const bots = data?.bots || [];
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
          const res = await fetch(`${API_BASE}/bots/${previewBot.id}/activity?limit=20`);
          if (res.ok) {
            const json = await res.json();
            setActivityLogs(json.data?.activity || []);
          } else {
            setActivityLogs([]);
          }
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
          const res = await fetch(`${API_BASE}/bots/${previewBot.id}/history?limit=20`);
          if (res.ok) {
            const json = await res.json();
            setChatHistory(json.data?.history || []);
          } else {
            setChatHistory([]);
          }
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

    return allKeys.filter(key => {
      // Match exact provider name or provider-instance
      // e.g. 'openai' or 'openai-prod'
      return validPrefixes.some(prefix => key === prefix || key.startsWith(`${prefix}-`));
    });
  };

  const handleUpdateConfig = async (bot: BotData, field: 'llmProvider' | 'messageProvider', value: string) => {
    try {
      setActionLoading(bot.id);
      // Map field names: client uses 'messageProvider' (or 'provider' in BotData interface?)
      // BotData has 'provider' for message, 'llmProvider' for LLM.
      // API expects { provider: ..., llmProvider: ... }

      const payload: any = {};
      if (field === 'messageProvider') { payload.provider = value; }
      if (field === 'llmProvider') { payload.llmProvider = value; }

      const res = await fetch(`${API_BASE}/bots/${bot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) { throw new Error('Failed to update bot configuration'); }

      await refetch();
    } catch (err: any) {
      alert('Error updating bot: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };


  const handleCreateBot = async () => {
    if (!canCreateBot) { return; }

    try {
      setActionLoading('create');
      const response = await fetch(`${API_BASE}/bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBotName,
          description: newBotDesc,
          messageProvider: newBotMessageProvider,
          ...(newBotLlmProvider ? { llmProvider: newBotLlmProvider } : {}),
          persona: newBotPersona,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create bot');
      }

      // Reset form
      setNewBotName('');
      setNewBotDesc('');
      setNewBotPersona('default');
      setNewBotMessageProvider('');
      setNewBotLlmProvider('');
      setShowCreateModal(false);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bot');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (bot: BotData) => {
    const action = bot.status === 'active' ? 'stop' : 'start';

    try {
      setActionLoading(bot.id);
      const response = await fetch(`${API_BASE}/bots/${bot.id}/${action}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} bot`);
      }

      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} bot`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.bot) { return; }
    if (deleteConfirmation !== deleteModal.bot.name) { return; }

    try {
      setActionLoading(deleteModal.bot.id);
      const response = await fetch(`${API_BASE}/bots/${deleteModal.bot.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete bot');
      }

      setDeleteModal({ isOpen: false, bot: null });
      setDeleteConfirmation('');
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bot');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClone = async (bot: BotData) => {
    try {
      setActionLoading(bot.id);
      const response = await fetch(`${API_BASE}/bots/${bot.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: `${bot.name} (Clone)` }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to clone bot');
      }

      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone bot');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdatePersona = async (bot: BotData, persona: string) => {
    try {
      setActionLoading(bot.id);
      const response = await fetch(`${API_BASE}/bots/${bot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update persona');
      }

      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update persona');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string, connected: boolean) => {
    if (status === 'active' && connected) {
      return <span className="badge badge-success gap-1 text-xs font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-green-900 animate-pulse" /> Running</span>;
    } else if (status === 'active' && !connected) {
      return <span className="badge badge-warning gap-1 text-xs font-semibold">Disconnected</span>;
    } else {
      return <span className="badge badge-ghost text-xs font-semibold opacity-50">Disabled</span>;
    }
  };

  const redact = (str: string) => {
    if (!str) { return ''; }
    if (str.length <= 4) { return '****'; }
    return str.substring(0, 2) + '*'.repeat(Math.min(str.length - 4, 8)) + str.substring(str.length - 2);
  };



  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* WIP Alert */}
      <div className="alert alert-warning shadow-sm">
        <Info className="w-5 h-5" />
        <span>This page is currently a Work In Progress. Some features (like activity logs) may contain mock data.</span>
      </div>

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
          <div className="stat-value text-green-500">{bots.filter(b => b.status === 'active' && b.connected).length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Disconnected</div>
          <div className="stat-value text-yellow-500">{bots.filter(b => b.status === 'active' && !b.connected).length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Errors</div>
          <div className="stat-value text-red-500">{bots.reduce((sum, b) => sum + (b.errorCount || 0), 0)}</div>
        </div>
      </div>

      {/* DataTable */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-0">
          {loading && bots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <span className="loading loading-bars loading-lg text-primary" />
              <p className="text-base-content/50 animate-pulse">Loading bots...</p>
            </div>
          ) : bots.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
              <h3 className="text-lg font-medium text-base-content/60">No bots configured</h3>
              <p className="text-base-content/50 mb-4">Create a bot configuration to get started</p>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" /> Create Bot
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {bots.map((bot) => (
                <div key={bot.id} className="bg-base-100 border border-base-300 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all group">
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
                          {bot.llmProvider ? (
                            llmProfiles.find(p => p.key === bot.llmProvider)?.name || bot.llmProvider
                          ) : 'Default LLM'}
                        </span>
                        {bot.messageCount > 0 && (
                          <span className="flex items-center gap-1 border-l border-base-content/20 pl-4" title="Messages Processed">
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
            // Wrap update to refresh selected bot state if needed
            await handleUpdateConfig(bot, key as any, value);
            // We might need to fetch the updated bot from the list to keep modal in sync?
            // Since handleUpdateConfig updates state, the 'bot' prop from the list *should* update if we keyed it correctly.
            // But 'selectedBotForConfig' is a separate state piece. We need to update it too.
            setSelectedBotForConfig(prev => prev ? { ...prev, [key]: value, config: { ...prev.config, [key]: value } } : null);
          }}
          onUpdatePersona={async (bot: any, pid: string) => {
            await handleUpdatePersona(bot, pid);
            setSelectedBotForConfig(prev => prev ? { ...prev, persona: pid } : null);
          }}
          onClone={(b: any) => { handleClone(b); setSelectedBotForConfig(null); }}
          onDelete={(b: any) => { setDeleteModal({ isOpen: true, bot: b }); setSelectedBotForConfig(null); }}
          onViewDetails={(b: any) => { setPreviewBot(b); setSelectedBotForConfig(null); }}
        />
      )}

      {/* Create Bot Wizard Modal */}
      < Modal
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
      </Modal >

      {/* Delete Confirmation Modal */}
      < Modal
        isOpen={deleteModal.isOpen}
        onClose={() => {
          setDeleteModal({ isOpen: false, bot: null });
          setDeleteConfirmation('');
        }}
        title="Delete Bot"
        size="sm"
      >
        <div className="space-y-4">
          <p>Are you sure you want to delete <strong>{deleteModal.bot?.name}</strong>?</p>
          <p className="text-sm text-base-content/60">This action cannot be undone. To confirm, please type the name of the bot below.</p>

          <div className="form-control w-full">
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder={`Type "${deleteModal.bot?.name}" to confirm`}
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button className="btn btn-ghost" onClick={() => {
              setDeleteModal({ isOpen: false, bot: null });
              setDeleteConfirmation('');
            }}>Cancel</button>
            <button
              className="btn btn-error"
              onClick={handleDelete}
              disabled={actionLoading === deleteModal.bot?.id || deleteConfirmation !== deleteModal.bot?.name}
            >
              {actionLoading === deleteModal.bot?.id ? <span className="loading loading-spinner loading-xs" /> : 'Delete'}
            </button>
          </div>
        </div>
      </Modal >

      {/* Preview Modal */}
      < Modal
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
                <div className="mt-2">{getStatusBadge(previewBot.status, previewBot.connected)}</div>
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
                      onClick={() => window.location.href = '/admin/integrations/message'}
                      title="Configure Message Provider"
                    >
                      <Settings className="w-3 h-3" /> Config
                    </button>
                  </div>
                  <p className="text-lg font-bold mb-1">{previewBot.messageProvider || previewBot.provider || 'None'}</p>
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
                      onClick={() => window.location.href = '/admin/integrations/llm'}
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
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Recent Activity
              </h4>
              <div className="bg-base-300 rounded-lg p-4 h-48 overflow-y-auto font-mono text-xs">
                {activityLogs.length > 0 ? (
                  activityLogs.map((log) => (
                    <div key={log.id} className="mb-1 border-b border-base-content/5 pb-1 last:border-0">
                      <span className="opacity-50 mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className={
                        log.metadata?.type === 'RUNTIME' ? 'text-info' :
                          log.action?.includes('ERROR') || log.result === 'failure' ? 'text-error' :
                            'text-base-content'
                      }>
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
              <button className="btn btn-ghost" onClick={() => setPreviewBot(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => window.location.href = '/admin/integrations/llm'}>
                <Settings className="w-4 h-4 mr-2" />
                Configure Providers
              </button>
            </div>
          </div>
        )}
      </Modal >
    </div >
  );
};

export default BotsPage;
