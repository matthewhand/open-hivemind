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

const API_BASE = '/api';

const BotsPage: React.FC = () => {
  const [bots, setBots] = useState<BotData[]>([]);
  const [personas, setPersonas] = useState<any[]>([]); // added personas state
  const [llmProfiles, setLlmProfiles] = useState<any[]>([]); // added profiles state
  const [globalConfig, setGlobalConfig] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [previewBot, setPreviewBot] = useState<BotData | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [configResponse, globalResponse, personasResponse, profilesResponse] = await Promise.all([
        fetch(`${API_BASE}/config`),
        fetch(`${API_BASE}/config/global`),
        fetch(`${API_BASE}/personas`),
        fetch(`${API_BASE}/config/llm-profiles`),
      ]);

      if (!configResponse.ok) { throw new Error('Failed to fetch bot config'); }
      const configData = await configResponse.json();
      setBots(configData.bots || []);

      if (personasResponse.ok) {
        const personasData = await personasResponse.json();
        setPersonas(personasData);
      }

      if (profilesResponse.ok) {
        const profilesData = await profilesResponse.json();
        setLlmProfiles(profilesData.profiles?.llm || []);
      }

      if (globalResponse.ok) {
        const globalData = await globalResponse.json();
        const simplifiedConfig: any = {};
        // Flatten global config for easy key access
        Object.keys(globalData).forEach(key => {
          simplifiedConfig[key] = globalData[key].values;
        });
        setGlobalConfig(simplifiedConfig);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

      await fetchData();
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
      await fetchData();
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

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} bot`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.bot) { return; }

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
      await fetchData();
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

      await fetchData();
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

      await fetchData();
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

      {/* Header */}
      <PageHeader
        title="Bot Management"
        description="Manage your AI bot instances"
        icon={Bot}
        gradient="primary"
        actions={
          <>
            <button onClick={fetchData} className="btn btn-ghost gap-2" disabled={loading}>
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
                <div key={bot.id} className="collapse collapse-arrow bg-base-100 border border-base-300 hover:shadow-md transition-shadow">
                  <input type="radio" name="bots-accordion" className="peer" />
                  <div className="collapse-title flex items-center justify-between pr-12 py-4">
                    <div className="flex items-center gap-4">
                      <BotAvatar bot={bot} />
                      <div className="flex flex-col">
                        <span className="font-bold text-lg">{bot.name}</span>
                        <div className="flex items-center gap-2 text-sm text-base-content/60">
                          <span className="font-mono text-xs opacity-50">{bot.id}</span>
                        </div>
                      </div>
                    </div>
                    {/* Status Toggle and Badge on the right */}
                    <div className="flex items-center gap-3 z-10" onClick={(e) => e.stopPropagation()}>
                      <div className="text-right">
                        {getStatusBadge(bot.status, bot.connected)}
                      </div>
                      <input
                        type="checkbox"
                        className={`toggle toggle-sm ${bot.status === 'active' ? 'toggle-success' : ''}`}
                        checked={bot.status === 'active'}
                        onChange={() => handleToggleStatus(bot)}
                        disabled={actionLoading === bot.id}
                      />
                    </div>
                  </div>

                  <div className="collapse-content">
                    <div className="divider my-0"></div>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-4 pb-2">
                      {/* Column 1: Integrations */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-base-content/50 uppercase tracking-wider flex items-center gap-2">
                          Integrations
                          <div className="tooltip tooltip-right" data-tip="Configure external services this bot connects to.">
                            <Info className="w-3 h-3 cursor-help opacity-70 hover:opacity-100" />
                          </div>
                        </h4>

                        {/* Message Provider */}
                        <div className="form-control w-full">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium flex items-center gap-1 opacity-70">
                              <MessageSquare className="w-3 h-3" /> Messenger
                              <div className="tooltip tooltip-top" data-tip="The platform where this bot sends and receives messages (e.g., Discord, Slack).">
                                <Info className="w-3 h-3 cursor-help opacity-50 hover:opacity-100" />
                              </div>
                            </span>
                          </div>
                          <div className="dropdown w-full">
                            <div tabIndex={0} role="button" className="btn btn-sm btn-ghost border border-base-300 w-full justify-between font-normal">
                              {(bot as any).messageProvider || bot.provider || 'Select...'} <Edit2 className="w-3 h-3 opacity-50" />
                            </div>
                            <ul tabIndex={0} className="dropdown-content z-[2] menu p-2 shadow-lg bg-neutral text-neutral-content rounded-box w-full text-sm border border-base-300">
                              {getIntegrationOptions('message').map(opt => (
                                <li key={opt}>
                                  <a onClick={() => { handleUpdateConfig(bot, 'messageProvider', opt); (document.activeElement as HTMLElement)?.blur(); }} className={bot.provider === opt ? 'active' : ''}>
                                    {opt}
                                  </a>
                                </li>
                              ))}
                              <div className="divider my-1"></div>
                              <li>
                                <a href="/admin/integrations/message" target="_blank" className="flex gap-2 items-center text-primary">
                                  <Plus className="w-3 h-3" /> New Messenger
                                </a>
                              </li>
                            </ul>
                          </div>
                        </div>

                        {/* LLM Provider / Profile */}
                        <div className="form-control w-full" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium flex items-center gap-1 opacity-70">
                              <Cpu className="w-3 h-3" /> LLM Profile
                              <div className="tooltip tooltip-top" data-tip="Select an LLM Profile for this bot.">
                                <Info className="w-3 h-3 cursor-help opacity-50 hover:opacity-100" />
                              </div>
                            </span>
                          </div>
                          <div className="dropdown w-full">
                            <div tabIndex={0} role="button" className="btn btn-sm btn-ghost border border-base-300 w-full justify-between font-normal">
                              {bot.llmProvider || <span className="opacity-50 italic">System Default</span>} <Edit2 className="w-3 h-3 opacity-50" />
                            </div>
                            <ul tabIndex={0} className="dropdown-content z-[2] menu p-2 shadow-lg bg-neutral text-neutral-content rounded-box w-full text-sm border border-base-300">
                              {/* System Default Option */}
                              <li>
                                <a onClick={() => { handleUpdateConfig(bot, 'llmProvider', ''); (document.activeElement as HTMLElement)?.blur(); }} className={!bot.llmProvider ? 'active' : ''}>
                                  <span className="italic opacity-75">System Default</span>
                                </a>
                              </li>

                              <div className="divider my-1"></div>

                              {/* Custom Profiles */}
                              {llmProfiles.map(profile => (
                                <li key={profile.key}>
                                  <a onClick={() => { handleUpdateConfig(bot, 'llmProvider', profile.key); (document.activeElement as HTMLElement)?.blur(); }} className={bot.llmProvider === profile.key ? 'active' : ''}>
                                    <div className="flex flex-col gap-0.5">
                                      <span>{profile.name}</span>
                                      <span className="text-[10px] opacity-50 uppercase">{profile.provider}</span>
                                    </div>
                                  </a>
                                </li>
                              ))}

                              <div className="divider my-1"></div>
                              <li>
                                <a href="/admin/integrations/llm" target="_blank" className="flex gap-2 items-center text-primary">
                                  <Plus className="w-3 h-3" /> New Profile
                                </a>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Settings (Persona & Guards) */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-base-content/50 uppercase tracking-wider flex items-center gap-2">
                          Settings
                          <div className="tooltip tooltip-right" data-tip="Configure behavior and safety rules.">
                            <Info className="w-3 h-3 cursor-help opacity-70 hover:opacity-100" />
                          </div>
                        </h4>

                        {/* Persona Selector */}
                        <div className="form-control w-full">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium flex items-center gap-1 opacity-70">
                              <User className="w-3 h-3" /> Persona
                              <div className="tooltip tooltip-top" data-tip="Defines the bot's personality and system instructions.">
                                <Info className="w-3 h-3 cursor-help opacity-50 hover:opacity-100" />
                              </div>
                            </span>
                          </div>
                          <div className="dropdown w-full">
                            <div tabIndex={0} role="button" className="btn btn-sm btn-ghost border border-base-300 w-full justify-between font-normal">
                              {bot.persona || 'default'} <Edit2 className="w-3 h-3 opacity-50" />
                            </div>
                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-neutral text-neutral-content rounded-box w-full text-sm border border-base-300">
                              {Array.from(new Set(['default', ...bots.map(b => b.persona).filter(Boolean) as string[]])).map(p => (
                                <li key={p}>
                                  <a onClick={() => { handleUpdatePersona(bot, p); (document.activeElement as HTMLElement)?.blur(); }} className={bot.persona === p ? 'active' : ''}>
                                    {p}
                                  </a>
                                </li>
                              ))}
                              <div className="divider my-1"></div>
                              <li>
                                <a onClick={() => {
                                  const newP = prompt('Enter new persona name:');
                                  if (newP) { handleUpdatePersona(bot, newP); }
                                }}>
                                  <Plus className="w-3 h-3" /> New Persona
                                </a>
                              </li>
                            </ul>
                          </div>
                        </div>

                        {/* Guards */}
                        <div className="collapse collapse-arrow border border-base-200 bg-base-100 rounded-lg">
                          <input type="checkbox" className="min-h-0 h-8" />
                          <div className="collapse-title min-h-0 h-8 p-2 flex items-center gap-2 text-sm font-medium">
                            <Shield className="w-3 h-3" /> Guards
                          </div>
                          <div className="collapse-content text-xs space-y-2 pt-2">
                            <label className="flex items-center justify-between cursor-pointer">
                              <span className="flex items-center gap-1">
                                Access Control
                                <div className="tooltip tooltip-right" data-tip="Limit who can interact with this bot.">
                                  <Info className="w-3 h-3 cursor-help opacity-50 hover:opacity-100" />
                                </div>
                              </span>
                              <input type="checkbox" className="toggle toggle-xs toggle-success" disabled checked={!!bot.config?.mcpGuard?.enabled} />
                            </label>
                            <label className="flex items-center justify-between cursor-pointer opacity-50">
                              <span>Rate Limiter</span>
                              <input type="checkbox" className="toggle toggle-xs" disabled />
                            </label>
                            <label className="flex items-center justify-between cursor-pointer opacity-50">
                              <span>Content Filter</span>
                              <input type="checkbox" className="toggle toggle-xs" disabled />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Management */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-base-content/50 uppercase tracking-wider flex items-center gap-2">
                          Management
                          <div className="tooltip tooltip-right" data-tip="Administrative actions for this bot.">
                            <Info className="w-3 h-3 cursor-help opacity-70 hover:opacity-100" />
                          </div>
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          <button
                            className="btn btn-sm btn-ghost border border-base-300 w-full justify-start gap-2"
                            onClick={() => setPreviewBot(bot)}
                          >
                            <Eye className="w-4 h-4" /> View Details & Logs
                          </button>
                          <button
                            className="btn btn-sm btn-ghost border border-base-300 w-full justify-start gap-2"
                            onClick={() => handleClone(bot)}
                            disabled={actionLoading === bot.id}
                          >
                            <Copy className="w-4 h-4" /> Clone Configuration
                          </button>
                          <div className={bot.envOverrides && Object.keys(bot.envOverrides).length > 0 ? 'tooltip tooltip-left w-full' : 'w-full'} data-tip="Cannot delete: Defined by environment variables">
                            <button
                              className="btn btn-sm btn-ghost border border-red-200 text-error hover:bg-error/10 w-full justify-start gap-2"
                              onClick={() => setDeleteModal({ isOpen: true, bot })}
                              disabled={!!(bot.envOverrides && Object.keys(bot.envOverrides).length > 0)}
                            >
                              <Trash2 className="w-4 h-4" /> Delete Bot
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Bot Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Bot"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Bot Name</span></label>
              <input
                type="text"
                placeholder="my-bot"
                className="input input-bordered w-full"
                value={newBotName}
                onChange={(e) => setNewBotName(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Description</span></label>
              <input
                type="text"
                placeholder="What does this bot do?"
                className="input input-bordered w-full"
                value={newBotDesc}
                onChange={(e) => setNewBotDesc(e.target.value)}
              />
            </div>

            <div className="form-control md:col-span-2">
              <label className="label"><span className="label-text">Initial Persona</span></label>
              <select
                className="select select-bordered w-full"
                value={newBotPersona}
                onChange={(e) => setNewBotPersona(e.target.value)}
              >
                <option value="default">Default (Helpful Assistant)</option>
                {personas.filter(p => p.id !== 'default').map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isBuiltIn ? '(Built-in)' : ''}
                  </option>
                ))}
              </select>
              <label className="label">
                <span className="label-text-alt text-base-content/60">
                  {personas.find(p => p.id === newBotPersona || p.name === newBotPersona)?.systemPrompt?.substring(0, 100)}...
                </span>
              </label>
            </div>
          </div>

          <div className="divider">Integrations</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Message Provider <span className="text-error">*</span></span></label>
              <div className="flex gap-2">
                <select
                  className={`select select-bordered w-full ${!newBotMessageProvider ? 'select-error' : ''}`}
                  value={newBotMessageProvider}
                  onChange={(e) => setNewBotMessageProvider(e.target.value)}
                >
                  <option value="">Select Provider</option>
                  <option value="discord">Discord</option>
                  <option value="slack">Slack</option>
                </select>
                <button
                  type="button"
                  className="btn btn-square btn-outline"
                  onClick={() => window.location.href = '/admin/integrations/message'}
                  title="Create New Message Provider"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <label className="label">
                <span className="label-text-alt text-base-content/60">Multiple message providers can be added after creation.</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">LLM Provider {defaultLlmConfigured ? '(optional)' : <span className="text-error">*</span>}</span></label>
              <select
                className={`select select-bordered w-full ${(!newBotLlmProvider && !defaultLlmConfigured) ? 'select-error' : ''}`}
                value={newBotLlmProvider}
                onChange={(e) => setNewBotLlmProvider(e.target.value)}
              >
                <option value="">
                  {defaultLlmConfigured ? 'Use System Default' : 'Select Profile'}
                </option>
                {llmProfiles.map(p => (
                  <option key={p.key} value={p.key}>{p.name} ({p.provider})</option>
                ))}
              </select>
              <label className="label">
                <span className="label-text-alt text-warning">Only one LLM provider allowed per bot.</span>
              </label>
              {!defaultLlmConfigured && (
                <div className="alert alert-warning mt-2">
                  <span>No default LLM is configured. Configure one or select an LLM for this bot.</span>
                  <a
                    className="btn btn-xs btn-outline ml-auto"
                    href="/admin/integrations/llm"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Configure LLM
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleCreateBot}
              disabled={actionLoading === 'create' || !canCreateBot}
            >
              {actionLoading === 'create' ? <span className="loading loading-spinner loading-xs" /> : 'Create Bot'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, bot: null })}
        title="Delete Bot"
        size="sm"
      >
        <div className="space-y-4">
          <p>Are you sure you want to delete <strong>{deleteModal.bot?.name}</strong>?</p>
          <p className="text-sm text-base-content/60">This action cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-6">
            <button className="btn btn-ghost" onClick={() => setDeleteModal({ isOpen: false, bot: null })}>Cancel</button>
            <button
              className="btn btn-error"
              onClick={handleDelete}
              disabled={actionLoading === deleteModal.bot?.id}
            >
              {actionLoading === deleteModal.bot?.id ? <span className="loading loading-spinner loading-xs" /> : 'Delete'}
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
      </Modal>
    </div >
  );
};

export default BotsPage;
