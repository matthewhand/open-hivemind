import { useCallback, useState } from 'react';
import { apiService } from '../../../services/api';
import { ErrorService } from '../../../services/ErrorService';
import type { BotConfig } from '../../../types/bot';
import { withRetry } from '../../../utils/withRetry';

export const useBotPreview = (): {
  previewBot: BotConfig | null;
  setPreviewBot: React.Dispatch<React.SetStateAction<BotConfig | null>>;
  previewTab: 'activity' | 'chat' | 'validation' | 'testdrive' | 'message';
  setPreviewTab: React.Dispatch<React.SetStateAction<'activity' | 'chat' | 'validation' | 'testdrive' | 'message'>>;
  activityLogs: any[];
  chatHistory: any[];
  logFilter: string;
  setLogFilter: React.Dispatch<React.SetStateAction<string>>;
  activityError: string | null;
  chatError: string | null;
  fetchPreviewActivity: (botId: string, limit?: number) => Promise<void>;
  fetchPreviewChat: (botId: string) => Promise<void>;
  handlePreviewBot: (bot: BotConfig) => Promise<void>;
} => {
  const [previewBot, setPreviewBot] = useState<BotConfig | null>(null);
  const [previewTab, setPreviewTab] = useState<'activity' | 'chat' | 'validation' | 'testdrive' | 'message'>('activity');
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const [activityError, setActivityError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  const fetchPreviewActivity = useCallback(async (botId: string, limit = 20): Promise<void> => {
    setActivityError(null);
    try {
      const activityJson = await withRetry(() =>
        apiService.get(`/api/bots/${botId}/activity?limit=${limit}`) as Promise<any>
      );
      setActivityLogs((activityJson as any).data?.activity || []);
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
        apiService.get(`/api/bots/${botId}/chat?limit=20`) as Promise<any>
      );
      setChatHistory((chatJson as any).data?.messages || []);
    } catch (err) {
      ErrorService.report(err, { botId, action: 'fetchChatHistory' });
      setChatError('Failed to load chat history');
      setChatHistory([]);
    }
  }, []);

  const handlePreviewBot = useCallback(async (bot: BotConfig) => {
    setPreviewBot(bot);
    setPreviewTab('activity');
    setActivityLogs([]);
    setChatHistory([]);
    setActivityError(null);
    setChatError(null);

    await Promise.allSettled([fetchPreviewActivity(bot.id), fetchPreviewChat(bot.id)]);
  }, [fetchPreviewActivity, fetchPreviewChat]);

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
