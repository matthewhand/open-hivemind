import fs from 'fs';
import {
  getMessengerProvider,
  resetMessengerProviderCache,
} from '@src/message/management/getMessengerProvider';

// Mock Discord Service
const mockDiscordService = {
  sendMessageToChannel: jest.fn().mockResolvedValue('discord-message-id'),
  getClientId: jest.fn().mockReturnValue('discord-client-123'),
  provider: 'discord',
  isConnected: jest.fn().mockReturnValue(true),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

// Mock Slack Service
const mockSlackService = {
  sendMessageToChannel: jest.fn().mockResolvedValue('slack-message-id'),
  getClientId: jest.fn().mockReturnValue('slack-client-456'),
  provider: 'slack',
  isConnected: jest.fn().mockReturnValue(true),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@hivemind/message-discord', () => ({
  DiscordService: {
    getInstance: jest.fn(() => mockDiscordService),
  },
}));

// Mocking the adapter directly as it is required in the source
jest.mock('@hivemind/message-slack', () => ({
  SlackService: {
    getInstance: jest.fn(() => mockSlackService),
  },
}));

jest.mock('@src/plugins/PluginLoader', () => ({
  loadPlugin: jest.fn(async (name: string) => {
    if (name === 'message-discord') {
      return { DiscordService: { getInstance: () => mockDiscordService } };
    }
    if (name === 'message-slack') {
      return { SlackService: { getInstance: () => mockSlackService } };
    }
    throw new Error(`Unknown plugin: ${name}`);
  }),
  instantiateMessageService: jest.fn((mod: any) => {
    if (mod?.DiscordService) return mockDiscordService;
    if (mod?.SlackService) return mockSlackService;
    return null;
  }),
}));

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    promises: {
      ...actual.promises,
      readFile: jest.fn(),
    },
  };
});

const mockFsPromises = fs.promises as jest.Mocked<typeof fs.promises>;

describe('getMessengerProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    resetMessengerProviderCache();
    process.env = { ...originalEnv };

    // Default mock for fs.promises.readFile (the source now uses async readFile)
    mockFsPromises.readFile.mockResolvedValue(
      JSON.stringify({
        providers: [
          { type: 'discord', enabled: true },
          { type: 'slack', enabled: true },
        ],
      }) as any
    );
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Provider Selection', () => {
    it('should return DiscordMessageProvider when MESSAGE_PROVIDER is "discord"', async () => {
      process.env.MESSAGE_PROVIDER = 'discord';
      const providers = await getMessengerProvider();

      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);

      const provider = providers[0];
      expect(typeof provider.sendMessageToChannel).toBe('function');
      expect(typeof provider.getClientId).toBe('function');
    });

    it('should return SlackMessageProvider when MESSAGE_PROVIDER is "slack"', async () => {
      process.env.MESSAGE_PROVIDER = 'slack';
      const providers = await getMessengerProvider();

      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);

      const provider = providers[0];
      expect(typeof provider.sendMessageToChannel).toBe('function');
      expect(typeof provider.getClientId).toBe('function');
    });

    it('should handle multiple providers when specified', async () => {
      process.env.MESSAGE_PROVIDER = 'discord,slack';
      const providers = await getMessengerProvider();

      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle unknown provider gracefully', async () => {
      process.env.MESSAGE_PROVIDER = 'unknown-provider';

      await expect(getMessengerProvider()).resolves.not.toThrow();
      const providers = await getMessengerProvider();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('should use default provider when MESSAGE_PROVIDER is not set', async () => {
      delete process.env.MESSAGE_PROVIDER;

      const providers = await getMessengerProvider();
      expect(Array.isArray(providers)).toBe(true);
    });
  });

  describe('Provider Functionality', () => {
    it('should return providers with required methods', async () => {
      process.env.MESSAGE_PROVIDER = 'discord';
      const providers = await getMessengerProvider();
      const provider = providers[0];

      // Check required methods exist
      expect(typeof provider.sendMessageToChannel).toBe('function');
      expect(typeof provider.getClientId).toBe('function');

      // Check optional methods if they exist
      if (provider.isConnected) {
        expect(typeof provider.isConnected).toBe('function');
      }
      if (provider.connect) {
        expect(typeof provider.connect).toBe('function');
      }
    });

    it('should return functional providers that can send messages', async () => {
      process.env.MESSAGE_PROVIDER = 'discord';
      const providers = await getMessengerProvider();
      const provider = providers[0];

      const result = await provider.sendMessageToChannel('test-channel', 'test message');
      expect(result).not.toBeUndefined();
      expect(mockDiscordService.sendMessageToChannel).toHaveBeenCalledWith(
        'test-channel',
        'test message'
      );
    });

    it('should return providers with correct client IDs', async () => {
      process.env.MESSAGE_PROVIDER = 'slack';
      const providers = await getMessengerProvider();
      const provider = providers[0];

      const clientId = provider.getClientId();
      expect(typeof clientId).toBe('string');
      expect(mockSlackService.getClientId).toHaveBeenCalled();
    });
  });

  describe('Configuration Loading', () => {
    it('should handle missing configuration file gracefully', async () => {
      mockFsPromises.readFile.mockRejectedValue(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      );

      const providers = await getMessengerProvider();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('should handle malformed configuration file', async () => {
      mockFsPromises.readFile.mockResolvedValue('invalid json' as any);

      const providers = await getMessengerProvider();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('should handle empty configuration file', async () => {
      mockFsPromises.readFile.mockResolvedValue(JSON.stringify({}) as any);

      const providers = await getMessengerProvider();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('should handle configuration with disabled providers', async () => {
      mockFsPromises.readFile.mockResolvedValue(
        JSON.stringify({
          providers: [
            { type: 'discord', enabled: false },
            { type: 'slack', enabled: true },
          ],
        }) as any
      );

      process.env.MESSAGE_PROVIDER = 'slack';
      const providers = await getMessengerProvider();
      expect(providers.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization errors gracefully', async () => {
      const { loadPlugin } = require('@src/plugins/PluginLoader');
      loadPlugin.mockRejectedValue(new Error('Service initialization failed'));

      process.env.MESSAGE_PROVIDER = 'discord';

      await expect(getMessengerProvider()).resolves.not.toThrow();
    });

    it('should handle file system errors gracefully', async () => {
      mockFsPromises.readFile.mockRejectedValue(new Error('File read error'));

      const providers = await getMessengerProvider();
      expect(Array.isArray(providers)).toBe(true);
    });
  });

  describe('Performance and Caching', () => {
    it('should return providers quickly', async () => {
      process.env.MESSAGE_PROVIDER = 'discord';

      const startTime = Date.now();
      await getMessengerProvider();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    it('should handle multiple rapid calls efficiently', async () => {
      process.env.MESSAGE_PROVIDER = 'slack';

      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        await getMessengerProvider();
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // Should handle many calls efficiently
    });
  });
});

describe('getMessengerProvider additional branch coverage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    resetMessengerProviderCache();
    process.env = { ...originalEnv };
    const { loadPlugin, instantiateMessageService } = require('@src/plugins/PluginLoader');
    loadPlugin.mockImplementation(async (name: string) => {
      if (name === 'message-discord') {
        return { DiscordService: { getInstance: () => mockDiscordService } };
      }
      if (name === 'message-slack') {
        return { SlackService: { getInstance: () => mockSlackService } };
      }
      throw new Error(`Unknown plugin: ${name}`);
    });
    instantiateMessageService.mockImplementation((mod: any) => {
      if (mod?.DiscordService) {return mockDiscordService;}
      if (mod?.SlackService) {return mockSlackService;}
      return null;
    });
    mockFsPromises.readFile.mockResolvedValue(
      JSON.stringify({
        providers: [{ type: 'discord', enabled: true }],
      }) as any
    );
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('supports array-like provider filter via config fallback', async () => {
    delete process.env.MESSAGE_PROVIDER;
    mockFsPromises.readFile.mockResolvedValue(
      JSON.stringify({
        MESSAGE_PROVIDER: ['discord', 'slack'],
        providers: [{ type: 'discord', enabled: true }, { type: 'slack', enabled: true }],
      }) as any
    );

    const providers = await getMessengerProvider();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThan(0);
  });

  it('does not default to slack when filter is set but no providers match', async () => {
    process.env.MESSAGE_PROVIDER = 'mattermost';
    const providers = await getMessengerProvider();
    expect(providers).toEqual([]);
  });

  it('falls back to slack sentinel when default slack loader fails', async () => {
    const { loadPlugin } = require('@src/plugins/PluginLoader');
    loadPlugin.mockRejectedValue(new Error('plugin load failed'));

    delete process.env.MESSAGE_PROVIDER;
    mockFsPromises.readFile.mockResolvedValue(JSON.stringify({ providers: [] }) as any);

    const providers = await getMessengerProvider();
    expect(providers.length).toBe(1);
    expect(providers[0].provider).toBe('slack');
    expect(typeof providers[0].sendMessageToChannel).toBe('function');
  });

  it('resets cache and rereads config after reset', async () => {
    mockFsPromises.readFile.mockResolvedValueOnce(
      JSON.stringify({ providers: [{ type: 'discord', enabled: true }] }) as any
    );

    const first = await getMessengerProvider();
    expect(first.length).toBeGreaterThan(0);

    mockFsPromises.readFile.mockResolvedValueOnce(
      JSON.stringify({ providers: [] }) as any
    );

    resetMessengerProviderCache();
    const second = await getMessengerProvider();
    // with empty providers and no env filter, legacy fallback should still return slack
    expect(second.length).toBe(1);
    expect(second[0].provider).toBe('slack');
  });
});
