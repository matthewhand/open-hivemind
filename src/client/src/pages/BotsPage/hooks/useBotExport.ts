import { useCallback } from 'react';
import { apiService } from '../../../services/api';
import type { BotConfig } from '../../../types/bot';

export const useBotExport = (
  bots: BotConfig[],
  bulk: any,
  toastSuccess: (msg: string) => void,
  toastError: (msg: string) => void
) => {
  const handleBulkExport = () => {
    const selectedBots = bots.filter((b) => bulk.selectedIds.has(b.id));
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
      toastSuccess('Exported all bots');
    } catch (err) {
      toastError('Failed to export bots');
    }
  }, [toastSuccess, toastError]);

  const handleExportSingleBot = useCallback(
    async (bot: BotConfig) => {
      try {
        const data = await apiService.get<any>(`/api/bots/${bot.id}/export`);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bot-${bot.name.replace(/\s+/g, '-').toLowerCase()}-export.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        toastError('Failed to export bot');
      }
    },
    [toastError]
  );

  return { handleBulkExport, handleExportAll, handleExportSingleBot };
};
