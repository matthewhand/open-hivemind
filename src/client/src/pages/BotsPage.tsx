/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Bot, Plus, Edit2, Trash2, Check, RefreshCw, AlertCircle, 
  Search, Filter, ChevronRight, Activity, MessageSquare, 
  Settings, ExternalLink, Shield, Info, MoreVertical,
  Cpu, Zap, Copy, Save, X, Terminal, Globe, User, Clock,
  Key, ShieldCheck, Database, Layout, Command, 
  AlertTriangle, Play, Pause, Square, Trash, MoreHorizontal
} from 'lucide-react';
import { useSuccessToast, useErrorToast } from '../components/DaisyUI/ToastNotification';
import Modal, { ConfirmModal } from '../components/DaisyUI/Modal';
import PageHeader from '../components/DaisyUI/PageHeader';
import SearchFilterBar from '../components/SearchFilterBar';
<<<<<<< HEAD
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
=======
import EmptyState from '../components/DaisyUI/EmptyState';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import { withRetry, ErrorService } from '../services/apiService';
import apiService from '../services/apiService';
import type { BotConfig, ProviderModalState } from '../types/bot';
import { LLMProviderType, MessageProviderType } from '../types/bot';
import BotCard from '../components/BotManagement/BotCard';
import CreateBotWizard from '../components/BotManagement/CreateBotWizard';
import BotSettingsModal from '../components/BotSettingsModal';
import { useLocation } from 'react-router-dom';
>>>>>>> origin/main

const BotsPage: React.FC = () => {
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<BotConfig | null>(null);
  const [deletingBot, setDeletingBot] = useState<BotConfig | null>(null);
  const [previewBot, setPreviewBot] = useState<BotConfig | null>(null);
  const [previewTab, setPreviewTab] = useState<'activity' | 'chat'>('activity');
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState('');
  
  const toast = {
    success: useSuccessToast(),
    error: useErrorToast()
  };

  const location = useLocation();

  const fetchBots = useCallback(async () => {
    try {
      setLoading(true);
      const json = await withRetry(() => apiService.get<any>('/api/bots'));
      setBots(json.data?.bots || []);
      setError(null);
    } catch (err) {
      ErrorService.report(err, { action: 'fetchBots' });
      setError(err instanceof Error ? err.message : 'Failed to fetch bots');
      toast.error('Failed to load bots');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  // Handle bot creation from URL state
  useEffect(() => {
    if (location.state?.openCreateModal) {
      setIsCreateModalOpen(true);
      // Clear state after reading
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleCreateBot = async (botData: any) => {
    try {
      const response = await apiService.post<any>('/api/bots', botData);
      setBots(prev => [...prev, response.data.bot]);
      setIsCreateModalOpen(false);
      toast.success('Bot created successfully');
    } catch (err) {
      ErrorService.report(err, { action: 'createBot', botData });
      toast.error(err instanceof Error ? err.message : 'Failed to create bot');
    }
  };

  const handleUpdateBot = async (botData: any) => {
    try {
      const response = await apiService.put<any>(`/api/bots/${editingBot?.id}`, botData);
      setBots(prev => prev.map(b => b.id === editingBot?.id ? response.data.bot : b));
      setEditingBot(null);
      toast.success('Bot updated successfully');
      
      // Update preview if it's the same bot
      if (previewBot?.id === editingBot?.id) {
        setPreviewBot(response.data.bot);
      }
    } catch (err) {
      ErrorService.report(err, { action: 'updateBot', botId: editingBot?.id });
      toast.error(err instanceof Error ? err.message : 'Failed to update bot');
    }
  };

  const handleDeleteBot = async () => {
    if (!deletingBot) return;
    try {
      await apiService.delete(`/api/bots/${deletingBot.id}`);
      setBots(prev => prev.filter(b => b.id !== deletingBot.id));
      if (previewBot?.id === deletingBot.id) {
        setPreviewBot(null);
      }
      setDeletingBot(null);
      toast.success('Bot deleted successfully');
    } catch (err) {
      ErrorService.report(err, { action: 'deleteBot', botId: deletingBot.id });
      toast.error(err instanceof Error ? err.message : 'Failed to delete bot');
    }
  };

  const handleToggleBotStatus = async (bot: BotConfig) => {
    try {
      const newStatus = bot.status === 'active' ? 'inactive' : 'active';
      const response = await apiService.patch<any>(`/api/bots/${bot.id}/status`, { status: newStatus });
      setBots(prev => prev.map(b => b.id === bot.id ? { ...b, status: newStatus } : b));
      
      if (previewBot?.id === bot.id) {
        setPreviewBot(prev => prev ? { ...prev, status: newStatus } : null);
      }
      
      toast.success(`Bot ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      ErrorService.report(err, { action: 'toggleBotStatus', botId: bot.id });
      toast.error(err instanceof Error ? err.message : 'Failed to update bot status');
    }
  };

  const filteredBots = useMemo(() => {
    return bots.filter(bot => {
      const matchesSearch = (bot.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             bot.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter = filterType === 'all' || bot.status === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [bots, searchQuery, filterType]);

  const handlePreviewBot = async (bot: BotConfig) => {
    setPreviewBot(bot);
    setPreviewTab('activity');
    setActivityLogs([]);
    setChatHistory([]);
    
    try {
      // Load initial activity
      const activityJson = await withRetry(() => apiService.get<any>(`/api/bots/${bot.id}/activity?limit=20`));
      setActivityLogs(activityJson.data?.activity || []);
      
      // Load initial chat
      const chatJson = await withRetry(() => apiService.get<any>(`/api/bots/${bot.id}/chat?limit=20`));
      setChatHistory(chatJson.data?.messages || []);
    } catch (err) {
      ErrorService.report(err, { botId: bot.id, action: 'fetchBotPreviewData' });
      // Don't show toast for initial load failures to keep UI clean, but log error
      console.error('Failed to load bot preview data:', err);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!logFilter) return activityLogs;
    return activityLogs.filter(log => 
      log.message?.toLowerCase().includes(logFilter.toLowerCase()) ||
      log.type?.toLowerCase().includes(logFilter.toLowerCase())
    );
  }, [activityLogs, logFilter]);

<<<<<<< HEAD
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
=======
  if (loading && bots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-base-content/60 animate-pulse">Loading your AI Swarm...</p>
      </div>
    );
  }
>>>>>>> origin/main

  return (
    <div className="space-y-6">
      <PageHeader 
        title="AI Swarm Management" 
        description="Configure, monitor, and deploy your specialized AI agents."
        icon={<Bot className="w-8 h-8 text-primary" />}
        actions={
          <button 
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Create New Bot
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content: Bot List */}
        <div className="lg:col-span-2 space-y-4">
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Search agents by name or purpose..."
          >
            <div className="flex gap-2">
              <select 
                className="select select-bordered select-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              <button 
                className="btn btn-ghost btn-sm btn-square"
                onClick={fetchBots}
                title="Refresh list"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </SearchFilterBar>

          {error && (
            <div className="alert alert-error shadow-sm">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
              <button className="btn btn-ghost btn-xs" onClick={fetchBots}>Try Again</button>
            </div>
          )}

          {filteredBots.length === 0 ? (
            <EmptyState
              icon={<Bot className="w-16 h-16 text-base-content/20" />}
              title={searchQuery ? "No agents found" : "Your swarm is empty"}
              description={searchQuery ? "No agents match your search criteria." : "Start by creating your first specialized AI agent."}
              action={
                !searchQuery && (
                  <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                    Create First Bot
                  </button>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBots.map(bot => (
                <BotCard
                  key={bot.id}
                  bot={bot}
                  isSelected={previewBot?.id === bot.id}
                  onPreview={() => handlePreviewBot(bot)}
                  onEdit={() => setEditingBot(bot)}
                  onDelete={() => setDeletingBot(bot)}
                  onToggleStatus={() => handleToggleBotStatus(bot)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Bot Preview/Details */}
        <div className="lg:col-span-1">
          {previewBot ? (
            <div className="card bg-base-100 shadow-xl border border-base-200 sticky top-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="card-body p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-primary/10`}>
                      <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{previewBot.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`badge badge-xs ${previewBot.status === 'active' ? 'badge-success' : 'badge-ghost'}`}></span>
                        <span className="text-xs uppercase tracking-wider font-semibold opacity-60">{previewBot.status}</span>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm btn-square" onClick={() => setPreviewBot(null)}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Description</label>
                    <p className="text-sm italic">{previewBot.description || 'No description provided.'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-base-200/50 p-2 rounded-lg">
                      <label className="text-[10px] font-bold uppercase opacity-50 block mb-1">Provider</label>
                      <div className="flex items-center gap-2">
                        <Globe className="w-3 h-3 text-primary" />
                        <span className="text-xs font-medium uppercase">{previewBot.llmProvider}</span>
                      </div>
                    </div>
                    <div className="bg-base-200/50 p-2 rounded-lg">
                      <label className="text-[10px] font-bold uppercase opacity-50 block mb-1">Model</label>
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3 h-3 text-secondary" />
                        <span className="text-xs font-medium">{previewBot.llmModel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="stats bg-base-200 w-full shadow-sm">
                    <div className="stat p-3">
                      <div className="stat-title text-[10px] uppercase font-bold">Messages</div>
                      <div className="stat-value text-xl text-primary">{previewBot.messageCount || 0}</div>
                    </div>
                    <div className="stat p-3">
                      <div className="stat-title text-[10px] uppercase font-bold">Errors</div>
                      <div className={`stat-value text-xl ${(previewBot.errorCount || 0) > 0 ? 'text-error' : ''}`}>
                        {previewBot.errorCount || 0}
                      </div>
                    </div>
                  </div>

                  {/* Tabs Navigation */}
                  <div className="tabs tabs-boxed bg-base-200/50 p-1 flex-nowrap" role="tablist">
                    <button 
                      className={`tab tab-sm flex-1 gap-2 ${previewTab === 'activity' ? 'tab-active' : ''}`}
                      onClick={() => setPreviewTab('activity')}
                      role="tab"
                    >
                      <Activity className="w-3 h-3" /> <span className="text-[10px] uppercase font-bold">Activity</span>
                    </button>
                    <button 
                      className={`tab tab-sm flex-1 gap-2 ${previewTab === 'chat' ? 'tab-active' : ''}`}
                      onClick={() => setPreviewTab('chat')}
                      role="tab"
                    >
                      <MessageSquare className="w-3 h-3" /> <span className="text-[10px] uppercase font-bold">Chat</span>
                    </button>
                  </div>

                  {/* Activity Log Panel */}
                  {previewTab === 'activity' && (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      <div className="flex items-center justify-end mb-2">
                        <div className="join w-full">
                          <input 
                            type="text" 
                            placeholder="Filter..." 
                            className="input input-xs input-bordered join-item flex-1"
                            value={logFilter}
                            onChange={(e) => setLogFilter(e.target.value)}
                          />
                          <select 
                            className="select select-xs select-bordered join-item"
                            onChange={async (e) => {
                              const limit = e.target.value;
                              if (previewBot) {
                                try {
                                  const json = await withRetry(() => apiService.get<any>(`/api/bots/${previewBot.id}/activity?limit=${limit}`));
                                  setActivityLogs(json.data?.activity || []);
                                } catch (err) {
                                  ErrorService.report(err, { botId: previewBot.id, action: 'fetchActivityLogs' });
                                  toast.error('Failed to load bot activity logs');
                                  setActivityLogs([]);
                                }
                              }
                            }}
                          >
                            <option value="20">20</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                          </select>
                        </div>
                      </div>

                      {filteredLogs.length === 0 ? (
                        <div className="text-center py-8 opacity-40">
                          <Activity className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-xs">No activity recorded</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredLogs.map((log, idx) => (
                            <div key={idx} className="bg-base-200/30 p-2 rounded text-[11px] border-l-2 border-primary">
                              <div className="flex justify-between opacity-60 mb-1">
                                <span className="font-bold uppercase">{log.type}</span>
                                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <p className="line-clamp-2">{log.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chat History Panel */}
                  {previewTab === 'chat' && (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {chatHistory.length === 0 ? (
                        <div className="text-center py-8 opacity-40">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-xs">No recent chat history</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}>
                              <div className={`chat-bubble text-[11px] min-h-0 py-1.5 px-3 ${msg.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}>
                                {msg.content}
                              </div>
                              <div className="chat-footer opacity-50 text-[9px] mt-0.5">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="card-actions mt-2 pt-4 border-t border-base-200">
                    <button 
                      className="btn btn-primary btn-sm flex-1"
                      onClick={() => setEditingBot(previewBot)}
                    >
                      <Settings className="w-3 h-3 mr-2" /> Configuration
                    </button>
                    <button 
                      className={`btn btn-sm btn-square ${previewBot.status === 'active' ? 'btn-error btn-outline' : 'btn-success'}`}
                      onClick={() => handleToggleBotStatus(previewBot)}
                      title={previewBot.status === 'active' ? 'Deactivate' : 'Activate'}
                    >
                      {previewBot.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card bg-base-100 shadow-xl border border-dashed border-base-300 h-full min-h-[400px]">
              <div className="card-body items-center justify-center text-center opacity-40">
                <Bot className="w-12 h-12 mb-2" />
                <h3 className="font-bold">Agent Preview</h3>
                <p className="text-xs max-w-[200px]">Select an agent from the swarm to view its activity and configuration.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateBotWizard
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateBot}
        />
      )}

      {editingBot && (
        <BotSettingsModal
          isOpen={!!editingBot}
          bot={editingBot}
          onClose={() => setEditingBot(null)}
          onUpdate={handleUpdateBot}
        />
      )}

<<<<<<< HEAD
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
                <div className={`stat-value ${(previewBot.errorCount || 0) > 0 ? 'text-error' : ''}`}>{previewBot.errorCount || 0}</div>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="tabs tabs-boxed flex-wrap gap-1 mb-4" role="tablist" aria-label="Bot preview sections">
              <button
                className={`tab flex-1 ${previewTab === 'activity' ? 'tab-active' : ''}`}
                onClick={() => setPreviewTab('activity')}
                role="tab"
                aria-selected={previewTab === 'activity'}
                aria-controls="activity-panel"
                id="activity-tab"
              >
                <Activity className="w-4 h-4 mr-2" /> Recent Activity
              </button>
              <button
                className={`tab flex-1 ${previewTab === 'chat' ? 'tab-active' : ''}`}
                onClick={() => setPreviewTab('chat')}
                role="tab"
                aria-selected={previewTab === 'chat'}
                aria-controls="chat-panel"
                id="chat-tab"
              >
                <MessageSquare className="w-4 h-4 mr-2" /> Chat History
              </button>
            </div>

            {previewTab === 'activity' && (
              <div role="tabpanel" id="activity-panel" aria-labelledby="activity-tab">
                <div className="flex items-center justify-end mb-3">
<<<<<<< HEAD
                  <div className="form-control w-full flex flex-col items-end">
                    <div className="join">
                      <input
                        type="text"
                        placeholder="Filter logs..."
                        className="input input-xs input-bordered w-32 join-item"
                        value={logFilter}
                        onChange={(e) => setLogFilter(e.target.value)}
                      />
                      <select
                        className="select select-xs select-bordered join-item"
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
=======
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
>>>>>>> origin/main
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
            )}

            {previewTab === 'chat' && (
              <div role="tabpanel" id="chat-panel" aria-labelledby="chat-tab">
                <div className="bg-base-300 rounded-lg">
                  <BotChatBubbles
                    messages={chatHistory}
                    botName={previewBot.name}
                    loading={chatLoading}
                  />
                </div>
              </div>
            )}

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
=======
      <ConfirmModal
        isOpen={!!deletingBot}
        title="Delete Agent"
        message={`Are you sure you want to delete ${deletingBot?.name}? This action cannot be undone.`}
        confirmText="Delete Bot"
        variant="error"
        onConfirm={handleDeleteBot}
        onCancel={() => setDeletingBot(null)}
      />
>>>>>>> origin/main
    </div>
  );
};

export default BotsPage;
