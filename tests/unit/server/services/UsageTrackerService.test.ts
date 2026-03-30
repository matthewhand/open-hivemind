import fs from 'fs/promises';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { UsageTrackerService } from '@src/server/services/UsageTrackerService';

describe('UsageTrackerService', () => {
  let service: UsageTrackerService;
  const testDataPath = path.join(__dirname, '../../../../data/test-tool-usage-metrics.json');

  beforeEach(async () => {
    service = UsageTrackerService.getInstance();
    (service as any).dataFile = testDataPath;
    (service as any).data = { tools: {}, providers: {}, lastUpdated: new Date().toISOString() };
  });

  afterEach(async () => {
    try {
      await fs.unlink(testDataPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('Tool Metrics Tracking', () => {
    it('should record tool usage', async () => {
      await service.recordUsage({
        toolId: 'server-a-test-tool',
        serverName: 'server-a',
        toolName: 'test-tool',
        success: true,
        duration: 100,
        timestamp: new Date().toISOString(),
      });

      const metrics = service.getToolMetrics('server-a-test-tool');
      expect(metrics).toBeDefined();
      expect(metrics!.usageCount).toBe(1);
      expect(metrics!.successCount).toBe(1);
    });

    it('should track failures separately', async () => {
      await service.recordUsage({
        toolId: 'server-a-test-tool',
        serverName: 'server-a',
        toolName: 'test-tool',
        success: true,
        duration: 100,
        timestamp: new Date().toISOString(),
      });
      await service.recordUsage({
        toolId: 'server-a-test-tool',
        serverName: 'server-a',
        toolName: 'test-tool',
        success: false,
        duration: 50,
        timestamp: new Date().toISOString(),
      });

      const metrics = service.getToolMetrics('server-a-test-tool');
      expect(metrics!.usageCount).toBe(2);
      expect(metrics!.successCount).toBe(1);
      expect(metrics!.failureCount).toBe(1);
    });

    it('should calculate average duration correctly', async () => {
      for (const dur of [100, 200, 300]) {
        await service.recordUsage({
          toolId: 'server-a-test-tool',
          serverName: 'server-a',
          toolName: 'test-tool',
          success: true,
          duration: dur,
          timestamp: new Date().toISOString(),
        });
      }

      const metrics = service.getToolMetrics('server-a-test-tool');
      expect(metrics!.averageDuration).toBe(200);
    });
  });

  describe('Provider Metrics Tracking', () => {
    it('should record provider usage', async () => {
      await service.recordUsage({
        toolId: 'server-a-tool-1',
        serverName: 'server-a',
        toolName: 'tool-1',
        success: true,
        duration: 100,
        timestamp: new Date().toISOString(),
      });

      const metrics = service.getProviderMetrics('server-a');
      expect(metrics).toBeDefined();
      expect(metrics!.usageCount).toBe(1);
    });

    it('should handle multiple providers independently', async () => {
      await service.recordUsage({
        toolId: 'server-a-tool-1',
        serverName: 'server-a',
        toolName: 'tool-1',
        success: true,
        duration: 100,
        timestamp: new Date().toISOString(),
      });
      await service.recordUsage({
        toolId: 'server-b-tool-1',
        serverName: 'server-b',
        toolName: 'tool-1',
        success: true,
        duration: 200,
        timestamp: new Date().toISOString(),
      });

      const metricsA = service.getProviderMetrics('server-a');
      const metricsB = service.getProviderMetrics('server-b');
      expect(metricsA!.usageCount).toBe(1);
      expect(metricsB!.usageCount).toBe(1);
    });
  });

  describe('Top Tools and Providers', () => {
    it('should return top tools by usage', async () => {
      await service.recordUsage({
        toolId: 'a',
        serverName: 's',
        toolName: 'tool-a',
        success: true,
        duration: 100,
        timestamp: new Date().toISOString(),
      });
      await service.recordUsage({
        toolId: 'b',
        serverName: 's',
        toolName: 'tool-b',
        success: true,
        duration: 100,
        timestamp: new Date().toISOString(),
      });
      await service.recordUsage({
        toolId: 'b',
        serverName: 's',
        toolName: 'tool-b',
        success: true,
        duration: 100,
        timestamp: new Date().toISOString(),
      });

      const topTools = service.getTopTools(2);
      expect(topTools).toHaveLength(2);
      expect(topTools[0].toolId).toBe('b');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero duration', async () => {
      await service.recordUsage({
        toolId: 'test',
        serverName: 's',
        toolName: 'test',
        success: true,
        duration: 0,
        timestamp: new Date().toISOString(),
      });

      const metrics = service.getToolMetrics('test');
      expect(metrics!.averageDuration).toBe(0);
    });

    it('should handle non-existent tool metrics', () => {
      const metrics = service.getToolMetrics('non-existent');
      expect(metrics).toBeNull();
    });

    it('should clear all data', async () => {
      await service.recordUsage({
        toolId: 'test',
        serverName: 's',
        toolName: 'test',
        success: true,
        duration: 100,
        timestamp: new Date().toISOString(),
      });

      await service.clearAllData();

      const allTools = service.getAllToolMetrics();
      expect(allTools).toHaveLength(0);
    });
  });
});
