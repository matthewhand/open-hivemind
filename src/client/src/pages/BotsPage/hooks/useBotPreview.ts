import { useCallback, useState } from 'react';
import { apiService } from '../../../services/api';
import { ErrorService } from '../../../services/ErrorService';
import type { BotConfig } from '../../../types/bot';
import { withRetry } from '../../../utils/withRetry';

export const useBotPreview = () => {
  const [previewBot, setPreviewBot] = useState<BotConfig | null>(null);
  const [previewTab, setPreviewTab] = useState<'activity' | 'chat' | 'validation'>('activity');
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const [activityError, setActivityError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  const fetchPreviewActivity = useCallback(async (botId: string, limit = 20) => {
    setActivityError(null);
    try {
      const activityJson = await withRetry(() =>
        apiService.get<any>(`/api/bots/${botId}/activity?limit=${limit}`)
      );
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
      const chatJson = await withRetry(() =>
        apiService.get<any>(`/api/bots/${botId}/chat?limit=20`)
      );
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

    await Promise.allSettled([fetchPreviewActivity(bot.id), fetchPreviewChat(bot.id)]);
  };

  return {
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
    fetchPreviewActivity,
    fetchPreviewChat,
    handlePreviewBot,
  };
};
