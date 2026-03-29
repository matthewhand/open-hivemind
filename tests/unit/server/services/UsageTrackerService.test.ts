import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { UsageTrackerService } from '@src/server/services/UsageTrackerService';

describe('UsageTrackerService', () => {
  let service: UsageTrackerService;
  const testDataPath = path.join(__dirname, '../../../../data/test-tool-usage-metrics.json');

  beforeEach(async () => {
    // Use a test-specific data path
    service = UsageTrackerService.getInstance();
    (service as any).dataPath = testDataPath;
    (service as any).metrics = new Map();
    (service as any).providerMetrics = new Map();
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(testDataPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('Tool Metrics Tracking', () => {
    it('should record tool usage', () => {
      service.recordToolUse('test-tool', true, 100);

      const stats = service.getToolStats('test-tool');
      expect(stats.usageCount).toBe(1);
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(0);
      expect(stats.averageDuration).toBe(100);
    });

    it('should track failures separately', () => {
      service.recordToolUse('test-tool', true, 100);
      service.recordToolUse('test-tool', false, 50);

      const stats = service.getToolStats('test-tool');
      expect(stats.usageCount).toBe(2);
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(1);
    });

    it('should calculate average duration correctly', () => {
      service.recordToolUse('test-tool', true, 100);
      service.recordToolUse('test-tool', true, 200);
      service.recordToolUse('test-tool', true, 300);

      const stats = service.getToolStats('test-tool');
      expect(stats.averageDuration).toBe(200);
    });

    it('should track first and last used timestamps', () => {
      const before = Date.now();
      service.recordToolUse('test-tool', true, 100);
      const after = Date.now();

      const stats = service.getToolStats('test-tool');
      expect(stats.firstUsed).toBeGreaterThanOrEqual(before);
      expect(stats.lastUsed).toBeLessThanOrEqual(after);
    });
  });

  describe('Provider Metrics Tracking', () => {
    it('should record provider usage', () => {
      service.recordProviderUse('openai', true, 100);

      const stats = service.getProviderStats('openai');
      expect(stats.usageCount).toBe(1);
      expect(stats.successCount).toBe(1);
      expect(stats.averageDuration).toBe(100);
    });

    it('should handle multiple providers independently', () => {
      service.recordProviderUse('openai', true, 100);
      service.recordProviderUse('anthropic', true, 200);

      const openaiStats = service.getProviderStats('openai');
      const anthropicStats = service.getProviderStats('anthropic');

      expect(openaiStats.usageCount).toBe(1);
      expect(anthropicStats.usageCount).toBe(1);
      expect(openaiStats.averageDuration).toBe(100);
      expect(anthropicStats.averageDuration).toBe(200);
    });
  });

  describe('Top Tools and Providers', () => {
    it('should return top tools by usage', () => {
      service.recordToolUse('tool-a', true, 100);
      service.recordToolUse('tool-b', true, 100);
      service.recordToolUse('tool-b', true, 100);
      service.recordToolUse('tool-c', true, 100);
      service.recordToolUse('tool-c', true, 100);
      service.recordToolUse('tool-c', true, 100);

      const topTools = service.getTopTools(2);
      expect(topTools).toHaveLength(2);
      expect(topTools[0].toolId).toBe('tool-c');
      expect(topTools[0].usageCount).toBe(3);
      expect(topTools[1].toolId).toBe('tool-b');
      expect(topTools[1].usageCount).toBe(2);
    });

    it('should return top providers by usage', () => {
      service.recordProviderUse('openai', true, 100);
      service.recordProviderUse('anthropic', true, 100);
      service.recordProviderUse('anthropic', true, 100);

      const topProviders = service.getTopProviders(2);
      expect(topProviders).toHaveLength(2);
      expect(topProviders[0].providerId).toBe('anthropic');
      expect(topProviders[0].usageCount).toBe(2);
    });
  });

  describe('Recently Used', () => {
    it('should return recently used tools', () => {
      service.recordToolUse('tool-old', true, 100);
      // Wait a bit to ensure different timestamps
      jest.advanceTimersByTime(10);
      service.recordToolUse('tool-new', true, 100);

      const recent = service.getRecentlyUsedTools(2);
      expect(recent[0].toolId).toBe('tool-new');
    });
  });

  describe('Persistence', () => {
    it('should save metrics to file', async () => {
      service.recordToolUse('test-tool', true, 100);

      // Trigger save manually (bypass debounce)
      await (service as any).saveMetrics();

      // Check file exists
      const fileExists = await fs.access(testDataPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should load metrics from file', async () => {
      // Save some data
      service.recordToolUse('test-tool', true, 100);
      await (service as any).saveMetrics();

      // Create new instance to test loading
      const newService = UsageTrackerService.getInstance();
      (newService as any).dataPath = testDataPath;
      await (newService as any).loadMetrics();

      const stats = newService.getToolStats('test-tool');
      expect(stats.usageCount).toBe(1);
    });
  });

  describe('Clear Metrics', () => {
    it('should clear all metrics', () => {
      service.recordToolUse('tool-1', true, 100);
      service.recordProviderUse('openai', true, 100);

      service.clearAllMetrics();

      expect(service.getAllToolStats()).toHaveLength(0);
      expect(service.getAllProviderStats()).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero duration', () => {
      service.recordToolUse('test-tool', true, 0);

      const stats = service.getToolStats('test-tool');
      expect(stats.averageDuration).toBe(0);
    });

    it('should handle non-existent tool stats', () => {
      const stats = service.getToolStats('non-existent');
      expect(stats.usageCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
    });

    it('should handle negative duration gracefully', () => {
      service.recordToolUse('test-tool', true, -10);

      const stats = service.getToolStats('test-tool');
      // Should still record usage but clamp duration
      expect(stats.usageCount).toBe(1);
    });
  });
});
