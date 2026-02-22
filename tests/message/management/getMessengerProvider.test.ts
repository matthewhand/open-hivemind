import fs from 'fs';
import { getMessengerProvider } from '@src/message/management/getMessengerProvider';

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

jest.mock('@hivemind/adapter-discord', () => ({
  DiscordService: {
    getInstance: jest.fn(() => mockDiscordService),
  },
}));

jest.mock('@hivemind/adapter-slack/SlackService', () => ({
  SlackService: {
    getInstance: jest.fn(() => mockSlackService),
  },
}));

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('getMessengerProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    // Default mock for fs.readFileSync
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({
        providers: [
          { type: 'discord', enabled: true },
          { type: 'slack', enabled: true },
        ],
      })
    );

    mockFs.existsSync.mockReturnValue(true);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Provider Selection', () => {
    it('should return DiscordMessageProvider when MESSAGE_PROVIDER is "discord"', () => {
      process.env.MESSAGE_PROVIDER = 'discord';
      const providers = getMessengerProvider();

      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);

      const provider = providers[0];
      expect(provider).toBeDefined();
      expect(typeof provider.sendMessageToChannel).toBe('function');
      expect(typeof provider.getClientId).toBe('function');
    });

    it('should return SlackMessageProvider when MESSAGE_PROVIDER is "slack"', () => {
      process.env.MESSAGE_PROVIDER = 'slack';
      const providers = getMessengerProvider();

      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);

      const provider = providers[0];
      expect(provider).toBeDefined();
      expect(typeof provider.sendMessageToChannel).toBe('function');
      expect(typeof provider.getClientId).toBe('function');
    });

    it('should handle multiple providers when specified', () => {
      process.env.MESSAGE_PROVIDER = 'discord,slack';
      const providers = getMessengerProvider();

      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle unknown provider gracefully', () => {
      process.env.MESSAGE_PROVIDER = 'unknown-provider';

      expect(() => getMessengerProvider()).not.toThrow();
      const providers = getMessengerProvider();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('should use default provider when MESSAGE_PROVIDER is not set', () => {
      delete process.env.MESSAGE_PROVIDER;

      const providers = getMessengerProvider();
      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
    });
  });

  describe('Provider Functionality', () => {
    it('should return providers with required methods', () => {
      process.env.MESSAGE_PROVIDER = 'discord';
      const providers = getMessengerProvider();
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
      const providers = getMessengerProvider();
      const provider = providers[0];

      const result = await provider.sendMessageToChannel('test-channel', 'test message');
      expect(result).toBeDefined();
      expect(mockDiscordService.sendMessageToChannel).toHaveBeenCalledWith(
        'test-channel',
        'test message'
      );
    });

    it('should return providers with correct client IDs', () => {
      process.env.MESSAGE_PROVIDER = 'slack';
      const providers = getMessengerProvider();
      const provider = providers[0];

      const clientId = provider.getClientId();
      expect(clientId).toBeDefined();
      expect(typeof clientId).toBe('string');
      expect(mockSlackService.getClientId).toHaveBeenCalled();
    });
  });

  describe('Configuration Loading', () => {
    it('should handle missing configuration file gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => getMessengerProvider()).not.toThrow();
      const providers = getMessengerProvider();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('should handle malformed configuration file', () => {
      mockFs.readFileSync.mockReturnValue('invalid json');

      expect(() => getMessengerProvider()).not.toThrow();
      const providers = getMessengerProvider();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('should handle empty configuration file', () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));

      expect(() => getMessengerProvider()).not.toThrow();
      const providers = getMessengerProvider();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('should handle configuration with disabled providers', () => {
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          providers: [
            { type: 'discord', enabled: false },
            { type: 'slack', enabled: true },
          ],
        })
      );

      process.env.MESSAGE_PROVIDER = 'slack';
      const providers = getMessengerProvider();
      expect(providers.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization errors gracefully', () => {
      const { DiscordService } = require('@hivemind/adapter-discord');
      DiscordService.getInstance.mockImplementation(() => {
        throw new Error('Service initialization failed');
      });

      process.env.MESSAGE_PROVIDER = 'discord';

      expect(() => getMessengerProvider()).not.toThrow();
    });

    it('should handle file system errors gracefully', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      expect(() => getMessengerProvider()).not.toThrow();
      const providers = getMessengerProvider();
      expect(Array.isArray(providers)).toBe(true);
    });
  });

  describe('Performance and Caching', () => {
    it('should return providers quickly', () => {
      process.env.MESSAGE_PROVIDER = 'discord';

      const startTime = Date.now();
      getMessengerProvider();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    it('should handle multiple rapid calls efficiently', () => {
      process.env.MESSAGE_PROVIDER = 'slack';

      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        getMessengerProvider();
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // Should handle many calls efficiently
    });
  });
});
