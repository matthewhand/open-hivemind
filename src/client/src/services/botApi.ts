import { baseClient } from './baseClient';
import type { Bot, ProviderConfig } from './apiTypes';

export const botApi = {
  getBots: async (): Promise<any[]> => {
    return baseClient.get<any[]>('/api/bots');
  },

  getBotHistory: async (botId: string, limit: number = 20): Promise<any[]> => {
    const res = await baseClient.get<{ success: boolean; data: { history: any[] } }>(`/api/bots/${botId}/history?limit=${limit}`);
    return res.data?.history || [];
  },

  createBot: async (botData: {
    name: string;
    messageProvider: string;
    llmProvider?: string;
    config?: ProviderConfig;
  }): Promise<{ success: boolean; message: string; bot: Bot }> => {
    const payload = {
      ...botData,
      ...(botData.llmProvider ? {} : { llmProvider: undefined }),
    };
    return baseClient.post('/api/bots', payload);
  },

  updateBot: async (botId: string, updates: {
    name?: string;
    messageProvider?: string;
    llmProvider?: string;
    persona?: string;
    systemInstruction?: string;
    config?: ProviderConfig;
  }): Promise<{ success: boolean; message: string; bot: Bot }> => {
    return baseClient.put(`/api/bots/${botId}`, updates);
  },

  cloneBot: async (name: string, newName: string): Promise<{ success: boolean; message: string; bot: Bot }> => {
    return baseClient.post(`/api/bots/${name}/clone`, { newName });
  },

  deleteBot: async (name: string): Promise<{ success: boolean; message: string }> => {
    return baseClient.delete(`/api/bots/${name}`);
  },

  startBot: async (botId: string): Promise<{ success: boolean; message: string }> => {
    return baseClient.post(`/api/bots/${botId}/start`);
  },

  stopBot: async (botId: string): Promise<{ success: boolean; message: string }> => {
    return baseClient.post(`/api/bots/${botId}/stop`);
  }
};
