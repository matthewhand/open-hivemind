import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { apiService } from '../../services/api';
import { ErrorService } from '../../services/ErrorService';
import { useApiQuery } from '../../hooks/useApiQuery';
import { usePageLifecycle } from '../../hooks/usePageLifecycle';
import { useSuccessToast, useErrorToast } from '../DaisyUI/ToastNotification';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import useUrlParams from '../../hooks/useUrlParams';
import type { BotConfig } from '../../types/bot';
import { PROVIDER_CATEGORIES } from '../../config/providers';
import { withRetry } from '../../utils/withRetry';

export function useBotPageLogic() {
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [botsLoading, setBotsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    status: { type: 'string', default: 'all' },
  });

  const searchQuery = urlParams.search as string;
  const setSearchQuery = (v: string) => setUrlParam('search', v);
  const filterType = urlParams.status as 'all' | 'active' | 'inactive';
  const setFilterType = (v: 'all' | 'active' | 'inactive') => setUrlParam('status', v);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [editingBot, setEditingBot] = useState<BotConfig | null>(null);
  const [deletingBot, setDeletingBot] = useState<BotConfig | null>(null);
  const [previewBot, setPreviewBot] = useState<BotConfig | null>(null);

  const [previewTab, setPreviewTab] = useState<'activity' | 'chat' | 'validation'>('activity');
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const [activityError, setActivityError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toast = {
    success: useSuccessToast(),
    error: useErrorToast()
  };

  const location = useLocation();

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

    return { personas, llmProfiles, globalConfig };
  }, []);

  const {
    data: configData,
    loading: configLoading,
    error: lifecycleError,
  } = usePageLifecycle({
    title: 'Bot Management',
    fetchData: fetchPageData,
    initialData: { personas: [], llmProfiles: [], globalConfig: {} },
  });

  const personas = configData?.personas || [];
  const llmProfiles = configData?.llmProfiles || [];
  const globalConfig = configData?.globalConfig || {};

  const loading = botsLoading || configLoading;

  useEffect(() => {
    if (lifecycleError) {
      setError(lifecycleError.message);
    }
  }, [lifecycleError]);

  const getIntegrationOptions = (category: 'llm' | 'message') => {
    const allKeys = Object.keys(globalConfig);
    const validPrefixes = PROVIDER_CATEGORIES[category] || [];
    return allKeys.filter((key) =>
      validPrefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}-`))
    );
  };

  const {
    data: botsResponse,
    loading: botsQueryLoading,
    error: botsQueryError,
    refetch: refetchBots,
  } = useApiQuery<any>('/api/bots', { ttl: 30_000 });

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
      toast.error('Failed to load bots');
    } else if (!lifecycleError) {
      setError(null);
    }
  }, [botsQueryError, lifecycleError, toast]);

  const fetchBots = useCallback(async () => {
    await refetchBots();
  }, [refetchBots]);

  useEffect(() => {
    if (location.state?.openCreateModal) {
      setIsCreateModalOpen(true);
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

  const filteredBotIds = useMemo(() => filteredBots.map(b => b.id), [filteredBots]);
  const bulk = useBulkSelection(filteredBotIds);

  const handleReorder = useCallback(async (reordered: BotConfig[]) => {
    setBots(reordered);
    try {
      const ids = reordered.map(b => b.id);
      await apiService.put('/api/bots/reorder', { ids });
    } catch { /* ignore */ }
  }, []);

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
      toast.success('Selected bots deleted');
    } catch (err) {
      toast.error('Failed to delete some bots');
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

  const handleExportAll = useCallback(async () => {
    try {
      const data = await apiService.get<any>('/api/bots/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-bots-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported all bots');
    } catch (err) {
      toast.error('Failed to export bots');
    }
  }, [toast.success, toast.error]);

  const handleExportSingleBot = useCallback(async (bot: BotConfig) => {
    try {
      const data = await apiService.get<any>(`/api/bots/${bot.id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bot-${bot.name.replace(/\\s+/g, '-').toLowerCase()}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to export bot');
    }
  }, [toast.error]);

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

    await Promise.allSettled([
      fetchPreviewActivity(bot.id),
      fetchPreviewChat(bot.id),
    ]);
  };

  return {
    bots,
    filteredBots,
    loading,
    botsLoading,
    error,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isImportModalOpen,
    setIsImportModalOpen,
    editingBot,
    setEditingBot,
    deletingBot,
    setDeletingBot,
    previewBot,
    setPreviewBot,
    previewTab,
    setPreviewTab,
    activityLogs,
    chatHistory,
    logFilter,
    setLogFilter,
    activityError,
    chatError,
    bulkDeleting,
    bulk,
    personas,
    llmProfiles,
    globalConfig,
    fetchBots,
    getIntegrationOptions,
    handleCreateBot,
    handleUpdateBot,
    handleDeleteBot,
    handleToggleBotStatus,
    handleReorder,
    handleBulkDelete,
    handleBulkExport,
    handleExportAll,
    handleExportSingleBot,
    fetchPreviewActivity,
    fetchPreviewChat,
    handlePreviewBot
  };
}
