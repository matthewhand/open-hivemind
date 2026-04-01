/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ApiService } from './core';
import type { Bot, ProviderConfig } from './types';

export function botsMixin(api: ApiService) {
  return {
    getBots(): Promise<any[]> {
      return api.request<any[]>('/api/bots');
    },

    getBotHistory(botId: string, limit: number = 20): Promise<any[]> {
      return api.request<{ success: boolean; data: { history: any[] } }>(`/api/bots/${botId}/history?limit=${limit}`)
        .then(res => res.data?.history || []);
    },

    createBot(botData: {
      name: string;
      messageProvider: string;
      llmProvider?: string;
      config?: ProviderConfig;
    }): Promise<{ success: boolean; message: string; bot: Bot }> {
      const payload = {
        ...botData,
        ...(botData.llmProvider ? {} : { llmProvider: undefined }),
      };
      return api.request('/api/bots', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    updateBot(botId: string, updates: {
      name?: string;
      messageProvider?: string;
      llmProvider?: string;
      persona?: string;
      systemInstruction?: string;
      config?: ProviderConfig;
    }): Promise<{ success: boolean; message: string; bot: Bot }> {
      return api.request(`/api/bots/${botId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    cloneBot(name: string, newName: string): Promise<{ success: boolean; message: string; bot: Bot }> {
      return api.request(`/api/bots/${name}/clone`, {
        method: 'POST',
        body: JSON.stringify({ newName }),
      });
    },

    deleteBot(name: string): Promise<{ success: boolean; message: string }> {
      return api.request(`/api/bots/${name}`, { method: 'DELETE' });
    },

    startBot(botId: string): Promise<{ success: boolean; message: string }> {
      return api.request(`/api/bots/${botId}/start`, { method: 'POST' });
    },

    stopBot(botId: string): Promise<{ success: boolean; message: string }> {
      return api.request(`/api/bots/${botId}/stop`, { method: 'POST' });
    },
  };
}
