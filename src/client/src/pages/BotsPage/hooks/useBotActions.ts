import { useCallback } from 'react';
import { apiService } from '../../../services/api';
import type { BotConfig } from '../../../types/bot';

export const useBotActions = (
  bots: BotConfig[],
  setBots: React.Dispatch<React.SetStateAction<BotConfig[]>>,
  previewBot: BotConfig | null,
  setPreviewBot: (bot: BotConfig | null) => void,
  toastSuccess: (msg: string) => void,
  toastError: (msg: string) => void,
  fetchBots: () => void,
  setIsCreateModalOpen: (open: boolean) => void,
  setEditingBot: (bot: BotConfig | null) => void,
  bulk: any,
  setBulkDeleting: (deleting: boolean) => void,
  showStamp?: () => void
) => {
  const handleToggleBotStatus = async (bot: BotConfig) => {
    try {
      const newStatus = bot.status === 'active' ? 'inactive' : 'active';
      setBots((prev) => prev.map((b) => (b.id === bot.id ? { ...b, status: newStatus } : b)));
      if (previewBot?.id === bot.id) {
        setPreviewBot({ ...previewBot, status: newStatus });
      }

      await apiService.post(`/api/bots/${bot.id}/toggle`, { status: newStatus });
      toastSuccess(`Bot ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (_err) {
      setBots((prev) => prev.map((b) => (b.id === bot.id ? bot : b)));
      if (previewBot?.id === bot.id) {
        setPreviewBot(bot);
      }
      toastError(err instanceof Error ? err.message : 'Failed to toggle bot status');
    }
  };

  const handleUpdateBot = async (updatedBot: BotConfig) => {
    try {
      await apiService.put(`/api/bots/${updatedBot.id}`, updatedBot);
      setBots((prev) => prev.map((b) => (b.id === updatedBot.id ? updatedBot : b)));
      if (previewBot?.id === updatedBot.id) {
        setPreviewBot(updatedBot);
      }
      toastSuccess('Bot updated successfully');
      showStamp?.();
      setEditingBot(null);
    } catch (_err) {
      toastError(err instanceof Error ? err.message : 'Failed to update bot');
    }
  };

  const handleCreateBot = async (botData: Partial<BotConfig>) => {
    try {
      const response = await apiService.post<{ data: BotConfig }>('/api/bots', botData);
      setBots((prev) => [...prev, response.data]);
      toastSuccess('Bot created successfully');
      showStamp?.();
      setIsCreateModalOpen(false);
      fetchBots();
    } catch (_err) {
      toastError(err instanceof Error ? err.message : 'Failed to create bot');
      throw err;
    }
  };

  const handleReorder = useCallback(
    async (reordered: BotConfig[]) => {
      setBots(reordered);
      try {
        const ids = reordered.map((b) => b.id);
        await apiService.put('/api/bots/reorder', { ids });
      } catch {
        /* persist error ignored */
      }
    },
    [setBots]
  );

  const handleBulkDelete = async () => {
    if (bulk.selectedCount === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(bulk.selectedIds);
      await Promise.allSettled(ids.map((id) => apiService.delete(`/api/bots/${id as string}`)));
      setBots((prev) => prev.filter((b) => !bulk.selectedIds.has(b.id)));
      if (previewBot && bulk.selectedIds.has(previewBot.id)) {
        setPreviewBot(null);
      }
      bulk.clearSelection();
      toastSuccess('Selected bots deleted');
    } catch (_err) {
      toastError('Failed to delete some bots');
    } finally {
      setBulkDeleting(false);
    }
  };

  return {
    handleToggleBotStatus,
    handleUpdateBot,
    handleCreateBot,
    handleReorder,
    handleBulkDelete,
  };
};
