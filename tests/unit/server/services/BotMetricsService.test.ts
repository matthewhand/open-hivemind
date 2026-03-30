import fs from 'fs';
import path from 'path';
import { BotMetricsService } from '../../../../src/server/services/BotMetricsService';

jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
  constants: {
    F_OK: 0,
  },
}));

describe('BotMetricsService', () => {
  let service: BotMetricsService;
  const mockMetricsPath = path.join(process.cwd(), 'config', 'user', 'bot-metrics.json');

  beforeEach(async () => {
    jest.clearAllMocks();
    (BotMetricsService as any).instance = null;

    // Mock file not existing initially
    (fs.promises.access as jest.Mock).mockRejectedValue({ code: 'ENOENT' });
    (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

    service = BotMetricsService.getInstance();
    await service.waitForInitialization();
  });

  afterEach(() => {
    service.stop();
    (BotMetricsService as any).instance = null;
  });

  describe('initialization', () => {
    test('should create singleton instance', () => {
      const instance1 = BotMetricsService.getInstance();
      const instance2 = BotMetricsService.getInstance();

      expect(instance1).toBe(instance2);
    });

    test('should load metrics from file if it exists', async () => {
      const mockMetrics = {
        'bot-1': { messageCount: 10, errorCount: 2, lastActive: '2024-03-29T10:00:00Z' },
        'bot-2': { messageCount: 5, errorCount: 0, lastActive: '2024-03-29T11:00:00Z' },
      };

      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockMetrics));

      (BotMetricsService as any).instance = null;
      const newService = BotMetricsService.getInstance();
      await newService.waitForInitialization();

      const allMetrics = newService.getAllMetrics();
      expect(allMetrics['bot-1'].messageCount).toBe(10);
      expect(allMetrics['bot-2'].messageCount).toBe(5);

      newService.stop();
    });

    test('should handle file read errors gracefully', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('Read error'));

      (BotMetricsService as any).instance = null;
      const newService = BotMetricsService.getInstance();
      await newService.waitForInitialization();

      const allMetrics = newService.getAllMetrics();
      expect(allMetrics).toEqual({});

      newService.stop();
    });

    test('should handle corrupted metrics file', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.readFile as jest.Mock).mockResolvedValue('{ invalid json');

      (BotMetricsService as any).instance = null;
      const newService = BotMetricsService.getInstance();
      await newService.waitForInitialization();

      const allMetrics = newService.getAllMetrics();
      expect(allMetrics).toEqual({});

      newService.stop();
    });
  });

  describe('incrementMessageCount', () => {
    test('should increment message count for bot', () => {
      service.incrementMessageCount('test-bot');

      const metrics = service.getMetrics('test-bot');
      expect(metrics.messageCount).toBe(1);
      expect(metrics.errorCount).toBe(0);
    });

    test('should increment multiple times', () => {
      service.incrementMessageCount('test-bot');
      service.incrementMessageCount('test-bot');
      service.incrementMessageCount('test-bot');

      const metrics = service.getMetrics('test-bot');
      expect(metrics.messageCount).toBe(3);
    });

    test('should update lastActive timestamp', () => {
      const beforeTime = new Date().toISOString();
      service.incrementMessageCount('test-bot');
      const afterTime = new Date().toISOString();

      const metrics = service.getMetrics('test-bot');
      expect(metrics.lastActive).toBeDefined();
      expect(metrics.lastActive! >= beforeTime).toBe(true);
      expect(metrics.lastActive! <= afterTime).toBe(true);
    });

    test('should track multiple bots separately', () => {
      service.incrementMessageCount('bot-1');
      service.incrementMessageCount('bot-1');
      service.incrementMessageCount('bot-2');

      expect(service.getMetrics('bot-1').messageCount).toBe(2);
      expect(service.getMetrics('bot-2').messageCount).toBe(1);
    });
  });

  describe('incrementErrorCount', () => {
    test('should increment error count for bot', () => {
      service.incrementErrorCount('test-bot');

      const metrics = service.getMetrics('test-bot');
      expect(metrics.errorCount).toBe(1);
      expect(metrics.messageCount).toBe(0);
    });

    test('should increment multiple times', () => {
      service.incrementErrorCount('test-bot');
      service.incrementErrorCount('test-bot');
      service.incrementErrorCount('test-bot');

      const metrics = service.getMetrics('test-bot');
      expect(metrics.errorCount).toBe(3);
    });

    test('should update lastActive timestamp', () => {
      service.incrementErrorCount('test-bot');

      const metrics = service.getMetrics('test-bot');
      expect(metrics.lastActive).toBeDefined();
    });

    test('should track both messages and errors', () => {
      service.incrementMessageCount('test-bot');
      service.incrementMessageCount('test-bot');
      service.incrementErrorCount('test-bot');

      const metrics = service.getMetrics('test-bot');
      expect(metrics.messageCount).toBe(2);
      expect(metrics.errorCount).toBe(1);
    });
  });

  describe('getMetrics', () => {
    test('should return metrics for existing bot', () => {
      service.incrementMessageCount('test-bot');
      service.incrementErrorCount('test-bot');

      const metrics = service.getMetrics('test-bot');

      expect(metrics).toEqual({
        messageCount: 1,
        errorCount: 1,
        lastActive: expect.any(String),
      });
    });

    test('should return zero metrics for non-existent bot', () => {
      const metrics = service.getMetrics('non-existent-bot');

      expect(metrics).toEqual({
        messageCount: 0,
        errorCount: 0,
      });
    });

    test('should not modify internal state', () => {
      service.incrementMessageCount('test-bot');

      const metrics1 = service.getMetrics('test-bot');
      metrics1.messageCount = 999;

      const metrics2 = service.getMetrics('test-bot');
      expect(metrics2.messageCount).toBe(1);
    });
  });

  describe('getAllMetrics', () => {
    test('should return all bot metrics', () => {
      service.incrementMessageCount('bot-1');
      service.incrementMessageCount('bot-2');
      service.incrementErrorCount('bot-3');

      const allMetrics = service.getAllMetrics();

      expect(Object.keys(allMetrics)).toHaveLength(3);
      expect(allMetrics['bot-1'].messageCount).toBe(1);
      expect(allMetrics['bot-2'].messageCount).toBe(1);
      expect(allMetrics['bot-3'].errorCount).toBe(1);
    });

    test('should return empty object when no metrics exist', () => {
      const allMetrics = service.getAllMetrics();

      expect(allMetrics).toEqual({});
    });

    test('should return a copy of metrics', () => {
      service.incrementMessageCount('test-bot');

      const allMetrics = service.getAllMetrics();
      allMetrics['test-bot'].messageCount = 999;

      const freshMetrics = service.getAllMetrics();
      expect(freshMetrics['test-bot'].messageCount).toBe(1);
    });
  });

  describe('persistence', () => {
    test('should save metrics to file', async () => {
      service.incrementMessageCount('test-bot');
      service.incrementErrorCount('test-bot');

      // Trigger save
      await (service as any).saveMetrics();

      expect(fs.promises.mkdir).toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        mockMetricsPath,
        expect.stringContaining('test-bot'),
        undefined
      );
    });

    test('should handle save errors gracefully', async () => {
      (fs.promises.writeFile as jest.Mock).mockRejectedValue(new Error('Write error'));

      service.incrementMessageCount('test-bot');

      // Should not throw
      await expect((service as any).saveMetrics()).resolves.not.toThrow();
    });

    test('should handle directory creation errors', async () => {
      (fs.promises.mkdir as jest.Mock).mockRejectedValue(new Error('Mkdir error'));

      service.incrementMessageCount('test-bot');

      // Should not throw
      await expect((service as any).saveMetrics()).resolves.not.toThrow();
    });
  });

  describe('auto-save', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should auto-save every minute', async () => {
      const saveSpy = jest.spyOn(service as any, 'saveMetrics');

      service.incrementMessageCount('test-bot');

      // Fast-forward 60 seconds
      jest.advanceTimersByTime(60000);

      await Promise.resolve(); // Let promises resolve

      expect(saveSpy).toHaveBeenCalled();
    });

    test('should not auto-save before interval expires', () => {
      const saveSpy = jest.spyOn(service as any, 'saveMetrics');

      service.incrementMessageCount('test-bot');

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    test('should clear auto-save interval', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      service.stop();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    test('should trigger final save', async () => {
      const saveSpy = jest.spyOn(service as any, 'saveMetrics').mockResolvedValue(undefined);

      service.incrementMessageCount('test-bot');
      service.stop();

      // Give time for async save
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(saveSpy).toHaveBeenCalled();
    });

    test('should handle multiple stop calls', () => {
      expect(() => {
        service.stop();
        service.stop();
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    test('should handle bot names with special characters', () => {
      service.incrementMessageCount('bot-with-special-chars_123');
      service.incrementMessageCount('bot.with.dots');

      const metrics1 = service.getMetrics('bot-with-special-chars_123');
      const metrics2 = service.getMetrics('bot.with.dots');

      expect(metrics1.messageCount).toBe(1);
      expect(metrics2.messageCount).toBe(1);
    });

    test('should handle empty bot name', () => {
      service.incrementMessageCount('');

      const metrics = service.getMetrics('');
      expect(metrics.messageCount).toBe(1);
    });

    test('should handle very long bot names', () => {
      const longName = 'a'.repeat(1000);
      service.incrementMessageCount(longName);

      const metrics = service.getMetrics(longName);
      expect(metrics.messageCount).toBe(1);
    });

    test('should handle large number of bots', () => {
      for (let i = 0; i < 100; i++) {
        service.incrementMessageCount(`bot-${i}`);
      }

      const allMetrics = service.getAllMetrics();
      expect(Object.keys(allMetrics)).toHaveLength(100);
    });

    test('should handle large metric counts', () => {
      for (let i = 0; i < 10000; i++) {
        service.incrementMessageCount('high-traffic-bot');
      }

      const metrics = service.getMetrics('high-traffic-bot');
      expect(metrics.messageCount).toBe(10000);
    });
  });

  describe('concurrent access', () => {
    test('should handle concurrent increments', () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(Promise.resolve(service.incrementMessageCount('concurrent-bot')));
      }

      return Promise.all(promises).then(() => {
        const metrics = service.getMetrics('concurrent-bot');
        expect(metrics.messageCount).toBe(100);
      });
    });

    test('should handle mixed operations', () => {
      service.incrementMessageCount('bot-1');
      service.incrementErrorCount('bot-1');
      service.getMetrics('bot-1');
      service.incrementMessageCount('bot-1');
      const allMetrics = service.getAllMetrics();

      expect(allMetrics['bot-1'].messageCount).toBe(2);
      expect(allMetrics['bot-1'].errorCount).toBe(1);
    });
  });
});
