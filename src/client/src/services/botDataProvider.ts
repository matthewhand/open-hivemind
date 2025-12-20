import { Bot, CreateBotRequest } from '../types/bot';

// Mock data for development
const mockBots: Bot[] = [];

export const botDataProvider = {
  getList: async (params?: {
    pagination?: { page: number; perPage: number };
    sort?: { field: string; order: 'ASC' | 'DESC' };
    filter?: Record<string, any>;
  }): Promise<{ data: Bot[]; total: number }> => {
    let filteredBots = [...mockBots];
    
    // Apply filters
    if (params?.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        filteredBots = filteredBots.filter(bot =>
          (bot as any)[key]?.toLowerCase().includes(value.toLowerCase())
        );
      });
    }
    
    // Apply sorting
    if (params?.sort) {
      filteredBots.sort((a, b) => {
        const aValue = (a as any)[params.sort!.field];
        const bValue = (b as any)[params.sort!.field];
        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return params.sort!.order === 'DESC' ? -comparison : comparison;
      });
    }
    
    // Apply pagination
    const total = filteredBots.length;
    if (params?.pagination) {
      const start = (params.pagination.page - 1) * params.pagination.perPage;
      const end = start + params.pagination.perPage;
      filteredBots = filteredBots.slice(start, end);
    }
    
    return { data: filteredBots, total };
  },

  getOne: async (id: string): Promise<Bot> => {
    const bot = mockBots.find(b => b.id === id);
    if (!bot) throw new Error('Bot not found');
    return bot;
  },

  create: async (data: CreateBotRequest): Promise<Bot> => {
    const newBot: Bot = {
      id: `bot-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockBots.push(newBot);
    return newBot;
  },

  update: async (id: string, data: CreateBotRequest): Promise<Bot> => {
    const index = mockBots.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Bot not found');
    mockBots[index] = {
      ...mockBots[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    return mockBots[index];
  },

  delete: async (id: string): Promise<void> => {
    const index = mockBots.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Bot not found');
    mockBots.splice(index, 1);
  },

  getProviders: async () => {
    return {
      messageProviders: [
        { id: 'discord', name: 'Discord' },
        { id: 'slack', name: 'Slack' },
        { id: 'mattermost', name: 'Mattermost' }
      ],
      llmProviders: [
        { id: 'openai', name: 'OpenAI' },
        { id: 'flowise', name: 'Flowise' },
        { id: 'openwebui', name: 'OpenWebUI' },
        { id: 'openswarm', name: 'OpenSwarm' }
      ]
    };
  },

  getPersonas: async () => {
    return [
      { key: 'default', name: 'Default' },
      { key: 'helpful-assistant', name: 'Helpful Assistant' },
      { key: 'technical-support', name: 'Technical Support' },
      { key: 'customer-service', name: 'Customer Service' }
    ];
  },

  getMCPServers: async () => {
    return [
      { name: 'filesystem', serverUrl: 'http://localhost:3001' },
      { name: 'database', serverUrl: 'http://localhost:3002' },
      { name: 'weather', serverUrl: 'http://localhost:3003' }
    ];
  },

  validate: async (data: CreateBotRequest) => {
    const errors: string[] = [];
    
    if (!data.name) errors.push('Bot name is required');
    if (!data.messageProvider) errors.push('Message provider is required');
    // Allow missing LLM provider if a default LLM is configured elsewhere
    
    // Provider-specific validation
    if (data.messageProvider === 'discord' && !data.discord?.token) {
      errors.push('Discord bot token is required');
    }
    if (data.messageProvider === 'slack' && !data.slack?.botToken) {
      errors.push('Slack bot token is required');
    }
    if (data.llmProvider === 'openai' && !data.openai?.apiKey) {
      errors.push('OpenAI API key is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// Re-export types for compatibility
export type { Bot, CreateBotRequest } from '../types/bot';
