import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelegramProvider } from '../../src/providers/TelegramProvider';
import { DiscordProvider } from '../../src/providers/DiscordProvider';
import { SlackProvider } from '../../src/providers/SlackProvider';
import { MattermostProvider } from '../../src/providers/MattermostProvider';

describe('Message Provider Health Checks', () => {
  describe('TelegramProvider', () => {
    it('should have healthCheck method', () => {
      const provider = new TelegramProvider();
      expect(provider.healthCheck).toBeDefined();
      expect(typeof provider.healthCheck).toBe('function');
    });

    it('should return down status when no bots configured', async () => {
      const provider = new TelegramProvider();
      const health = await provider.healthCheck();

      expect(health.status).toBe('down');
      expect(health.connected).toBe(false);
      expect(health.details).toBeDefined();
    });
  });

  describe('DiscordProvider', () => {
    it('should have healthCheck method', () => {
      const mockService: any = {
        getAllBots: vi.fn(() => []),
      };
      const provider = new DiscordProvider(mockService);
      expect(provider.healthCheck).toBeDefined();
      expect(typeof provider.healthCheck).toBe('function');
    });

    it('should return down status when no bots configured', async () => {
      const mockService: any = {
        getAllBots: vi.fn(() => []),
      };
      const provider = new DiscordProvider(mockService);
      const health = await provider.healthCheck();

      expect(health.status).toBe('down');
      expect(health.connected).toBe(false);
      expect(health.details).toContain('No Discord bots configured');
    });

    it('should return healthy status when all bots connected', async () => {
      const mockService: any = {
        getAllBots: vi.fn(() => [
          {
            botUserName: 'test-bot',
            client: {
              isReady: () => true,
              ws: { ping: 50 },
            },
          },
        ]),
      };
      const provider = new DiscordProvider(mockService);
      const health = await provider.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.connected).toBe(true);
      expect(health.details).toContain('1/1 bot(s) connected');
    });
  });

  describe('SlackProvider', () => {
    it('should have healthCheck method', () => {
      const mockService: any = {
        getBotNames: vi.fn(() => []),
      };
      const provider = new SlackProvider(mockService);
      expect(provider.healthCheck).toBeDefined();
      expect(typeof provider.healthCheck).toBe('function');
    });

    it('should return down status when no bots configured', async () => {
      const mockService: any = {
        getBotNames: vi.fn(() => []),
      };
      const provider = new SlackProvider(mockService);
      const health = await provider.healthCheck();

      expect(health.status).toBe('down');
      expect(health.connected).toBe(false);
      expect(health.details).toContain('No Slack bots configured');
    });
  });

  describe('MattermostProvider', () => {
    it('should have healthCheck method', () => {
      const mockService: any = {
        getBotNames: vi.fn(() => []),
      };
      const provider = new MattermostProvider(mockService);
      expect(provider.healthCheck).toBeDefined();
      expect(typeof provider.healthCheck).toBe('function');
    });

    it('should return down status when no bots configured', async () => {
      const mockService: any = {
        getBotNames: vi.fn(() => []),
      };
      const provider = new MattermostProvider(mockService);
      const health = await provider.healthCheck();

      expect(health.status).toBe('down');
      expect(health.connected).toBe(false);
      expect(health.details).toContain('No Mattermost bots configured');
    });
  });

  describe('Health Check Response Structure', () => {
    it('should return required fields in health check response', async () => {
      const mockService: any = {
        getBotNames: vi.fn(() => []),
      };
      const provider = new SlackProvider(mockService);
      const health = await provider.healthCheck();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('connected');
      expect(health).toHaveProperty('details');
      expect(['healthy', 'degraded', 'down']).toContain(health.status);
      expect(typeof health.connected).toBe('boolean');
    });
  });
});
