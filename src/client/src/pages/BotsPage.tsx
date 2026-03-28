/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bot, Plus, Edit2, Trash2, Check, RefreshCw, AlertCircle,
  Search, Filter, ChevronRight, Activity, MessageSquare,
  Settings, ExternalLink, Shield, Info, MoreVertical,
  Cpu, Zap, Copy, Save, X, Terminal, Globe, User, Clock,
  Key, ShieldCheck, Database, Layout, Command,
  AlertTriangle, Play, Pause, Square, Trash, MoreHorizontal, Download
} from 'lucide-react';
import { useSuccessToast, useErrorToast } from '../components/DaisyUI/ToastNotification';
import Modal, { ConfirmModal } from '../components/DaisyUI/Modal';
import { useLlmStatus } from '../hooks/useLlmStatus';
import { usePageLifecycle } from '../hooks/usePageLifecycle';
import PageHeader from '../components/DaisyUI/PageHeader';
import SearchFilterBar from '../components/SearchFilterBar';
import EmptyState from '../components/DaisyUI/EmptyState';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import { apiService } from '../services/api';
import { withRetry } from '../utils/withRetry';
import { ErrorService } from '../services/ErrorService';
import { useApiQuery } from '../hooks/useApiQuery';
import type { BotConfig } from '../types/bot';
import BotCard from '../components/BotManagement/BotCard';
import { CreateBotWizard } from '../components/BotManagement/CreateBotWizard';
import { BotSettingsModal } from '../components/BotSettingsModal';
import { useLocation } from 'react-router-dom';
import { PROVIDER_CATEGORIES } from '../config/providers';
import { BotData } from '../hooks/useBotStats';
import useUrlParams from '../hooks/useUrlParams';
import { useBulkSelection } from '../hooks/useBulkSelection';
import BulkActionBar from '../components/BulkActionBar';

const BotsPage: React.FC = () => {
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [botsLoading, setBotsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    status: { type: 'string', default: 'all' },
  });
  const searchQuery = urlParams.search;
  const setSearchQuery = (v: string) => setUrlParam('search', v);
  const filterType = urlParams.status as 'all' | 'active' | 'inactive';
  const setFilterType = (v: 'all' | 'active' | 'inactive') => setUrlParam('status', v);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<BotConfig | null>(null);
  const [deletingBot, setDeletingBot] = useState<BotConfig | null>(null);
  const [previewBot, setPreviewBot] = useState<BotConfig | null>(null);
  const [previewTab, setPreviewTab] = useState<'activity' | 'chat'>('activity');
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const [activityError, setActivityError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

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

  // Fetch page-level config (personas, llmProfiles, globalConfig) — NOT bots
  const fetchPageData = useCallback(async (_signal: AbortSignal) => {
    const [globalResult, personasResult, profilesResult] = await Promise.allSettled([
      apiService.getGlobalConfig(),
      apiService.getPersonas(),
      apiService.getLlmProfiles(),
    ]);

    const globalData = globalResult.status === 'fulfilled' ? globalResult.value : {};
    const personasData = personasResult.status === 'fulfilled' ? personasResult.value : [];
    const profilesData = profilesResult.status === 'fulfilled' ? profilesResult.value : {};

    const personas = personasData || [];
    const llmProfiles = profilesData?.llm || profilesData?.profiles?.llm || [];

    const globalConfig: any = {};
    if (globalData) {
      Object.keys(globalData).forEach((key) => {
        globalConfig[key] = globalData[key].values;
      });
    }

    return {
      personas,
      llmProfiles,
      globalConfig,
    };
  }, []);

  // Use Page Lifecycle Hook for config data only
  const {
    data,
    loading: configLoading,
    error: lifecycleError,
    refetch,
  } = usePageLifecycle({
    title: 'Bot Management',
    fetchData: fetchPageData,
    initialData: { personas: [], llmProfiles: [], globalConfig: {} },
  });

  // Derived state
  const personas = data?.personas || [];
  const llmProfiles = data?.llmProfiles || [];
  const globalConfig = data?.globalConfig || {};

  // Unified loading state: true while either bots or config data is still loading
  const loading = botsLoading || configLoading;

  // Sync lifecycle error to UI error
  useEffect(() => {
    if (lifecycleError) {
      setError(lifecycleError.message);
    }
  }, [lifecycleError]);

  const getIntegrationOptions = (category: 'llm' | 'message') => {
    const allKeys = Object.keys(globalConfig);
    const validPrefixes = PROVIDER_CATEGORIES[category] || [];

    return allKeys.filter((key) => {
      // Match exact provider name or provider-instance
      // e.g. 'openai' or 'openai-prod'
      return validPrefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}-`));
    });
  };

  const toastSuccess = useSuccessToast();
  const toastError = useErrorToast();

  const toast = {
    success: toastSuccess,
    error: toastError
  };

  const location = useLocation();

  // Primary bot data source: /api/bots endpoint (runtime state) — via cache layer
  const {
    data: botsResponse,
    loading: botsQueryLoading,
    error: botsQueryError,
    refetch: refetchBots,
  } = useApiQuery<any>('/api/bots', { ttl: 30_000 });

  // Sync cached query results into local state so mutation handlers still work
  useEffect(() => {
    if (botsResponse) {
      setBots(botsResponse.data?.bots || []);
    }
  }, [botsResponse]);

  useEffect(() => {
    setBotsLoading(botsQueryLoading);
  }, [botsQueryLoading]);

  useEffect(() => {
    if (botsQueryError) {
      ErrorService.report(botsQueryError, { action: 'fetchBots' });
      setError(botsQueryError.message);
      toastError('Failed to load bots');
    } else {
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botsQueryError]);

  const fetchBots = useCallback(async () => {
    await refetchBots();
  }, [refetchBots]);

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
      setBots(prev => [...prev, response?.data?.bot]);
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
      setBots(prev => prev.map(b => b.id === editingBot?.id ? response?.data?.bot : b));
      setEditingBot(null);
      toast.success('Bot updated successfully');

      // Update preview if it's the same bot
      if (previewBot?.id === editingBot?.id) {
        setPreviewBot(response?.data?.bot);
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

  // Bulk selection
  const filteredBotIds = useMemo(() => filteredBots.map(b => b.id), [filteredBots]);
  const bulk = useBulkSelection(filteredBotIds);

  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleBulkDelete = async () => {
    if (bulk.selectedCount === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(bulk.selectedIds);
      await Promise.allSettled(ids.map(id => apiService.delete(`/api/bots/${id}`)));
      setBots(prev => prev.filter(b => !bulk.selectedIds.has(b.id)));
      if (previewBot && bulk.selectedIds.has(previewBot.id)) {
        setPreviewBot(null);
      }
      bulk.clearSelection();
      toastSuccess('Selected bots deleted');
    } catch (err) {
      toastError('Failed to delete some bots');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkExport = () => {
    const selectedBots = bots.filter(b => bulk.selectedIds.has(b.id));
    const blob = new Blob([JSON.stringify(selectedBots, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bots-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Fetch preview panel data for a bot
  const fetchPreviewActivity = useCallback(async (botId: string, limit = 20) => {
    setActivityError(null);
    try {
      const activityJson = await withRetry(() => apiService.get<any>(`/api/bots/${botId}/activity?limit=${limit}`));
      setActivityLogs(activityJson.data?.activity || []);
    } catch (err) {
      ErrorService.report(err, { botId, action: 'fetchActivityLogs' });
      setActivityError('Failed to load activity');
      setActivityLogs([]);
    }
  }, []);

  const fetchPreviewChat = useCallback(async (botId: string) => {
    setChatError(null);
    try {
      const chatJson = await withRetry(() => apiService.get<any>(`/api/bots/${botId}/chat?limit=20`));
      setChatHistory(chatJson.data?.messages || []);
    } catch (err) {
      ErrorService.report(err, { botId, action: 'fetchChatHistory' });
      setChatError('Failed to load chat history');
      setChatHistory([]);
    }
  }, []);

  const handlePreviewBot = async (bot: BotConfig) => {
    setPreviewBot(bot);
    setPreviewTab('activity');
    setActivityLogs([]);
    setChatHistory([]);
    setActivityError(null);
    setChatError(null);

    // Fetch both in parallel
    await Promise.allSettled([
      fetchPreviewActivity(bot.id),
      fetchPreviewChat(bot.id),
    ]);
  };

  const filteredLogs = useMemo(() => {
    if (!logFilter) return activityLogs;
    return activityLogs.filter(log =>
      log.message?.toLowerCase().includes(logFilter.toLowerCase()) ||
      log.type?.toLowerCase().includes(logFilter.toLowerCase())
    );
  }, [activityLogs, logFilter]);

  if (loading && bots.length === 0 && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-base-content/60 animate-pulse">Loading your AI Swarm...</p>
      </div>
    );
  }

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
        <div className={`${error && bots.length === 0 ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-4`}>
          <SearchFilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search agents by name or purpose..."
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
                aria-label="Refresh list"
              >
                <RefreshCw className={`w-4 h-4 ${botsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </SearchFilterBar>

          {error && bots.length > 0 && (
            <div className="alert alert-error shadow-sm mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
              <button className="btn btn-ghost btn-xs" onClick={fetchBots}>Try Again</button>
            </div>
          )}

          {error && bots.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="Failed to load swarm"
              description="We encountered an error while trying to load your AI agents. Please try again."
              actionLabel={
                <button className="btn btn-outline btn-error" onClick={fetchBots}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Connection
                </button>
              }
            />
          ) : filteredBots.length === 0 ? (
            <EmptyState
              icon={Bot}
              title={searchQuery ? "No agents found" : "Your swarm is empty"}
              description={searchQuery ? "No agents match your search criteria." : "Start by creating your first specialized AI agent."}
              actionLabel={
                !searchQuery && (
                  <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                    Create First Bot
                  </button>
                )
              }
            />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={bulk.isAllSelected}
                  onChange={() => bulk.toggleAll(filteredBotIds)}
                  aria-label="Select all bots"
                />
                <span className="text-xs text-base-content/60">Select all</span>
              </div>
              <BulkActionBar
                selectedCount={bulk.selectedCount}
                onClearSelection={bulk.clearSelection}
                actions={[
                  {
                    key: 'export',
                    label: 'Export',
                    icon: <Download className="w-4 h-4" />,
                    variant: 'primary',
                    onClick: handleBulkExport,
                  },
                  {
                    key: 'delete',
                    label: 'Delete',
                    icon: <Trash2 className="w-4 h-4" />,
                    variant: 'error',
                    onClick: handleBulkDelete,
                    loading: bulkDeleting,
                  },
                ]}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBots.map(bot => (
                  <div key={bot.id} className="relative">
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={bulk.isSelected(bot.id)}
                        onChange={(e) => bulk.toggleItem(bot.id, e as any)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${bot.name}`}
                      />
                    </div>
                    <BotCard
                      bot={bot}
                      isSelected={previewBot?.id === bot.id}
                      onPreview={() => handlePreviewBot(bot)}
                      onEdit={() => setEditingBot(bot)}
                      onDelete={() => setDeletingBot(bot)}
                      onToggleStatus={() => handleToggleBotStatus(bot)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sidebar: Bot Preview/Details */}
        {!(error && bots.length === 0) && (
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
                  <button className="btn btn-ghost btn-sm btn-square" onClick={() => setPreviewBot(null)} aria-label="Close preview">
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
                              const limit = parseInt(e.target.value, 10);
                              if (previewBot) {
                                await fetchPreviewActivity(previewBot.id, limit);
                              }
                            }}
                          >
                            <option value="20">20</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                          </select>
                        </div>
                      </div>

                      {activityError ? (
                        <div className="text-center py-6">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-error" />
                          <p className="text-xs text-error mb-2">{activityError}</p>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => previewBot && fetchPreviewActivity(previewBot.id)}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" /> Retry
                          </button>
                        </div>
                      ) : filteredLogs.length === 0 ? (
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
                      {chatError ? (
                        <div className="text-center py-6">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-error" />
                          <p className="text-xs text-error mb-2">{chatError}</p>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => previewBot && fetchPreviewChat(previewBot.id)}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" /> Retry
                          </button>
                        </div>
                      ) : chatHistory.length === 0 ? (
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
                      aria-label={previewBot.status === 'active' ? 'Deactivate' : 'Activate'}
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
        )}
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
          bot={editingBot as any}
          onClose={() => setEditingBot(null)}
          personas={personas}
          llmProfiles={llmProfiles}
          integrationOptions={{ message: getIntegrationOptions('message') }}
          onUpdateConfig={async (bot, key, value) => {
            await handleUpdateBot({ ...bot, [key]: value });
          }}
          onUpdatePersona={async (bot, personaId) => {
            await handleUpdateBot({ ...bot, persona: personaId });
          }}
          onClone={(bot) => {
            setEditingBot(null);
            handleCreateBot({ ...bot, name: `${bot.name}-copy`, id: undefined });
          }}
          onDelete={(bot) => {
            setEditingBot(null);
            setDeletingBot(bot as any);
          }}
          onViewDetails={(bot) => setPreviewBot(bot as any)}
        />
      )}

      <ConfirmModal
        isOpen={!!deletingBot}
        title="Delete Agent"
        message={`Are you sure you want to delete ${deletingBot?.name}? This action cannot be undone.`}
        confirmText="Delete Bot"
        confirmVariant="error"
        onConfirm={handleDeleteBot}
        onClose={() => setDeletingBot(null)}
      />
    </div>
  );
};

export default BotsPage;
