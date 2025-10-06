import type { Bot, CreateBotRequest } from '../types/bot';

// Mock data for development
const mockBots: Bot[] = [];

export const botDataProvider = {
  getList: async (): Promise<Bot[]> => {
    return mockBots;
  },

  getOne: async (id: string): Promise<Bot> => {
    const bot = mockBots.find(b => b.id === id);
    if (!bot) throw new Error('Bot not found');
    return bot;
  },

  create: async (data: CreateBotRequest): Promise<Bot> => {
    const newBot: Bot = {
      id: `bot-${Date.now()}`,
      name: data.name,
      description: data.description,
      instance: {
        id: `instance-${Date.now()}`,
        name: data.name,
        status: 'inactive' as any,
        provider: {} as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        config: data.config
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockBots.push(newBot);
    return newBot;
  },

  update: async (id: string, data: Partial<Bot>): Promise<Bot> => {
    const index = mockBots.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Bot not found');
    mockBots[index] = { ...mockBots[index], ...data };
    return mockBots[index];
  },

  delete: async (id: string): Promise<void> => {
    const index = mockBots.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Bot not found');
    mockBots.splice(index, 1);
  }
};

// Re-export types for compatibility
export type { Bot, CreateBotRequest } from '../types/bot';
