import { DatabaseManager, type BotConfiguration, type Anomaly, type BotMetrics, type MessageRecord } from '../../../src/database/DatabaseManager';

describe('DatabaseManager', () => {
  let manager: DatabaseManager;

  beforeEach(() => {
    manager = DatabaseManager.getInstance({ type: 'sqlite', path: ':memory:' });
  });

  afterEach(async () => {
    if (manager.isConnected()) {
      await manager.disconnect();
    }
    // Clear singleton instance for clean tests
    (DatabaseManager as any).instance = null;
  });

  describe('Connection Management', () => {
    it('should handle connection management', async () => {
      // Connect successfully
      await manager.connect();
      expect(manager.isConnected()).toBe(true);

      // Disconnect successfully
      await manager.disconnect();
      expect(manager.isConnected()).toBe(false);

      // Handle multiple connect calls
      await manager.connect();
      await manager.connect(); // Should not throw
      expect(manager.isConnected()).toBe(true);

      // Handle disconnect when not connected
      await manager.disconnect();
      expect(manager.isConnected()).toBe(false);
      await expect(manager.disconnect()).resolves.not.toThrow();
    });
  });

  describe('Singleton Pattern', () => {
    it('should implement singleton pattern', async () => {
      // Return same instance
      const instance1 = DatabaseManager.getInstance({ type: 'sqlite', path: ':memory:' });
      const instance2 = DatabaseManager.getInstance({ type: 'sqlite', path: ':memory:' });
      expect(instance1).toBe(instance2);

      // Maintain state
      const instance3 = DatabaseManager.getInstance({ type: 'sqlite', path: ':memory:' });
      await instance3.connect();

      const instance4 = DatabaseManager.getInstance({ type: 'sqlite', path: ':memory:' });
      expect(instance4.isConnected()).toBe(true);
    });
  });

  describe('Message History', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should handle message history', async () => {
      // Return empty initially
      const history = await manager.getMessageHistory('test-channel');
      expect(history).toEqual([]);
      expect(Array.isArray(history)).toBe(true);

      // Handle invalid channel IDs
      const history2 = await manager.getMessageHistory('');
      expect(history2).toEqual([]);

      // Handle null/undefined
      await expect(manager.getMessageHistory(null as any)).resolves.toEqual([]);
      await expect(manager.getMessageHistory(undefined as any)).resolves.toEqual([]);
    });
  });

  describe('Message Storage and Retrieval', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should handle message storage and retrieval', async () => {
      const channelId = 'test-channel-store';

      // Get initial empty history
      const initialHistory = await manager.getMessageHistory(channelId);
      expect(initialHistory).toEqual([]);

      const message: MessageRecord = {
        messageId: 'msg1',
        channelId: channelId,
        content: 'Hello',
        authorId: 'user1',
        authorName: 'Test User',
        timestamp: new Date(),
        provider: 'test'
      };

      await manager.storeMessage(message);

      const updatedHistory = await manager.getMessageHistory(channelId);
      expect(updatedHistory.length).toBe(1);
      expect(updatedHistory[0].content).toBe('Hello');
    });
  });

  describe('Database Schema and Migration', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should handle database schema and migration', async () => {
      // Test that the database is properly initialized
      expect(manager.isConnected()).toBe(true);

      // Test schema by successful CRUD operations (implies tables created)
      const config: BotConfiguration = {
        name: 'schema-test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const id = await manager.createBotConfiguration(config);
      expect(id).toBeGreaterThan(0);

      // Test migration by checking tenantId handling (added in migration)
      await manager.updateBotConfiguration(id, { tenantId: 'test-tenant' });
      const updated = await manager.getBotConfiguration(id);
      expect(updated!.tenantId).toBe('test-tenant');
    });
  });

  describe('Performance and Scalability', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should handle performance and scalability', async () => {
      // Handle large histories
      const channelId = 'large-history-channel';
      const startTime = Date.now();

      const history = await manager.getMessageHistory(channelId);
      const endTime = Date.now();

      expect(Array.isArray(history)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000);

      // Handle multiple concurrent connections
      const managers = Array.from({ length: 5 }, () =>
        DatabaseManager.getInstance({ type: 'sqlite', path: ':memory:' })
      );

      managers.forEach((mgr) => {
        expect(mgr).toBe(manager);
      });

      // Handle rapid successive queries
      const channelId2 = 'rapid-queries-channel';
      const queries = Array.from({ length: 50 }, () =>
        manager.getMessageHistory(channelId2)
      );

      const results = await Promise.all(queries);
      expect(results).toHaveLength(50);
      results.forEach((result: MessageRecord[]) => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      manager = DatabaseManager.getInstance({ type: 'sqlite', path: ':memory:' });
    });

    it('should handle errors and edge cases', async () => {
      // Handle getting history without connection
      expect(manager.isConnected()).toBe(false);
      const result = await manager.getMessageHistory('test-channel');
      expect(Array.isArray(result)).toBe(true);

      // Handle invalid database configuration
      expect(() => {
        const invalidManager = DatabaseManager.getInstance({ type: 'invalid' as any, path: '' });
        expect(invalidManager).toBeDefined();
      }).not.toThrow();

      // Handle database connection failures
      const failingManager = DatabaseManager.getInstance({
        type: 'sqlite',
        path: '/invalid/path/database.db'
      });

      await expect(failingManager.connect()).rejects.toThrow();
      expect(failingManager.isConnected()).toBe(false);

      // Handle database corruption (malformed inputs)
      await manager.connect();

      const corruptChannelIds = [
        null,
        undefined,
        '',
        'a'.repeat(10000),
        '../../etc/passwd',
        '<script>alert("xss")</script>',
        'DROP TABLE messages;',
      ];

      for (const channelId of corruptChannelIds) {
        const result2 = await manager.getMessageHistory(channelId as any);
        expect(Array.isArray(result2)).toBe(true);
      }

      // Handle memory pressure
      const heavyOperations = Array.from({ length: 100 }, (_, i) =>
        manager.getMessageHistory(`stress-test-${i}`)
      );

      const results = await Promise.all(heavyOperations);
      expect(results).toHaveLength(100);
      results.forEach((result: MessageRecord[]) => {
        expect(Array.isArray(result)).toBe(true);
      });

      // Handle disconnection during operations
      await manager.connect();
      expect(manager.isConnected()).toBe(true);

      const operationPromise = manager.getMessageHistory('test-channel');
      await manager.disconnect();

      await expect(operationPromise).resolves.toBeDefined();

      // Handle reconnection
      await manager.connect();
      expect(manager.isConnected()).toBe(true);

      await manager.disconnect();
      expect(manager.isConnected()).toBe(false);

      await manager.connect();
      expect(manager.isConnected()).toBe(true);

      const result3 = await manager.getMessageHistory('reconnect-test');
      expect(Array.isArray(result3)).toBe(true);
    });
  });

  describe('Data Integrity and Validation', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should handle data integrity and validation', async () => {
      // Validate channel ID format
      const validChannelIds = [
        'channel-123',
        'general',
        'team_alpha',
        'project.beta',
        '1234567890'
      ];

      for (const channelId of validChannelIds) {
        const result = await manager.getMessageHistory(channelId);
        expect(Array.isArray(result)).toBe(true);
      }

      // Handle special characters
      const specialChannelIds = [
        'channel-with-émojis-🚀',
        'канал-на-русском',
        'チャンネル-日本語',
        'قناة-عربية'
      ];

      for (const channelId of specialChannelIds) {
        const result = await manager.getMessageHistory(channelId);
        expect(Array.isArray(result)).toBe(true);
      }

      // Maintain data consistency
      const channelId = 'consistency-test';

      const result1 = await manager.getMessageHistory(channelId);
      const result2 = await manager.getMessageHistory(channelId);

      expect(result1).toEqual(result2);
    });
  });

  describe('Configuration and Environment', () => {
    it('should handle configuration and environment', () => {
      // Handle different database types
      const configs = [
        { type: 'sqlite', path: ':memory:' },
        { type: 'sqlite', path: './test.db' },
      ];

      configs.forEach((config) => {
        expect(() => {
          const mgr = DatabaseManager.getInstance(config as any);
          expect(mgr).toBeDefined();
        }).not.toThrow();
      });

      // Handle missing configuration
      expect(() => {
        const mgr = DatabaseManager.getInstance(null as any);
        expect(mgr).toBeDefined();
      }).not.toThrow();

      expect(() => {
        const mgr = DatabaseManager.getInstance(undefined as any);
        expect(mgr).toBeDefined();
      }).not.toThrow();

      // Handle environment-specific configurations
      const originalEnv = process.env.NODE_ENV;

      try {
        ['development', 'production', 'test'].forEach((env) => {
          process.env.NODE_ENV = env;
          const mgr = DatabaseManager.getInstance({ type: 'sqlite', path: ':memory:' });
          expect(mgr).toBeDefined();
        });
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Bot Configuration CRUD', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should create bot configuration', async () => {
      const config: BotConfiguration = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const id = await manager.createBotConfiguration(config);
      expect(id).toBeGreaterThan(0);

      const saved = await manager.getBotConfiguration(id);
      expect(saved).toBeDefined();
      expect(saved!.name).toBe('test-bot');
      expect(saved!.messageProvider).toBe('discord');
    });

    it('should get bot configuration by ID', async () => {
      const config: BotConfiguration = {
        name: 'get-test-bot',
        messageProvider: 'slack',
        llmProvider: 'flowise',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const id = await manager.createBotConfiguration(config);
      const retrieved = await manager.getBotConfiguration(id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.llmProvider).toBe('flowise');
    });

    it('should return null for non-existent bot config', async () => {
      const retrieved = await manager.getBotConfiguration(999);
      expect(retrieved).toBeNull();
    });

    it('should update bot configuration', async () => {
      const config: BotConfiguration = {
        name: 'update-test-bot',
        messageProvider: 'mattermost',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const id = await manager.createBotConfiguration(config);
      await manager.updateBotConfiguration(id, { isActive: false, updatedAt: new Date() });

      const updated = await manager.getBotConfiguration(id);
      expect(updated!.isActive).toBe(false);
    });

    it('should delete bot configuration', async () => {
      const config: BotConfiguration = {
        name: 'delete-test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const id = await manager.createBotConfiguration(config);
      const deleted = await manager.deleteBotConfiguration(id);
      expect(deleted).toBe(true);

      const retrieved = await manager.getBotConfiguration(id);
      expect(retrieved).toBeNull();
    });

    it('should get all bot configurations', async () => {
      await manager.createBotConfiguration({
        name: 'all1',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as BotConfiguration);

      await manager.createBotConfiguration({
        name: 'all2',
        messageProvider: 'slack',
        llmProvider: 'flowise',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date()
      } as BotConfiguration);

      const all = await manager.getAllBotConfigurations();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Anomaly Management', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should store anomaly', async () => {
      const anomaly: Anomaly = {
        id: 'anom-1',
        timestamp: new Date(),
        metric: 'response_time',
        value: 5.2,
        expectedMean: 2.0,
        standardDeviation: 1.0,
        zScore: 3.2,
        threshold: 3.0,
        severity: 'high',
        explanation: 'Unusually slow response',
        resolved: false,
        tenantId: 'tenant1'
      };

      await manager.storeAnomaly(anomaly);

      const retrieved = await manager.getAnomalies('tenant1');
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].id).toBe('anom-1');
      expect(retrieved[0].severity).toBe('high');
    });

    it('should get anomalies for tenant', async () => {
      await manager.storeAnomaly({
        id: 'tenant-anom1',
        timestamp: new Date(),
        metric: 'error_rate',
        value: 0.15,
        expectedMean: 0.01,
        standardDeviation: 0.005,
        zScore: 2.8,
        threshold: 2.5,
        severity: 'medium',
        explanation: 'Increased errors',
        resolved: false,
        tenantId: 'test-tenant'
      } as Anomaly);

      const anomalies = await manager.getAnomalies('test-tenant');
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].metric).toBe('error_rate');
    });

    it('should get active anomalies', async () => {
      await manager.storeAnomaly({
        id: 'active1',
        timestamp: new Date(),
        metric: 'cpu_usage',
        value: 95,
        expectedMean: 50,
        standardDeviation: 10,
        zScore: 4.5,
        threshold: 3.0,
        severity: 'critical',
        explanation: 'High CPU',
        resolved: false
      } as Anomaly);

      await manager.storeAnomaly({
        id: 'resolved1',
        timestamp: new Date(),
        metric: 'memory_usage',
        value: 80,
        expectedMean: 40,
        standardDeviation: 15,
        zScore: 2.67,
        threshold: 2.5,
        severity: 'low',
        explanation: 'Resolved memory issue',
        resolved: true
      } as Anomaly);

      const active = await manager.getActiveAnomalies();
      expect(active.length).toBe(1);
      expect(active[0].id).toBe('active1');
    });

    it('should resolve anomaly', async () => {
      await manager.storeAnomaly({
        id: 'resolve-test',
        timestamp: new Date(),
        metric: 'latency',
        value: 10,
        expectedMean: 2,
        standardDeviation: 1,
        zScore: 8,
        threshold: 3,
        severity: 'critical',
        explanation: 'High latency',
        resolved: false
      } as Anomaly);

      const resolved = await manager.resolveAnomaly('resolve-test');
      expect(resolved).toBe(true);

      const anomalies = await manager.getActiveAnomalies();
      expect(anomalies.some((a: Anomaly) => a.id === 'resolve-test')).toBe(false);
    });
  });

  describe('Bot Metrics', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should update bot metrics', async () => {
      const metrics: BotMetrics = {
        botName: 'metrics-bot',
        messagesSent: 100,
        messagesReceived: 150,
        conversationsHandled: 20,
        averageResponseTime: 2.5,
        lastActivity: new Date(),
        provider: 'discord'
      };

      await manager.updateBotMetrics(metrics);

      const retrieved = await manager.getBotMetrics('metrics-bot');
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].messagesSent).toBe(100);
      expect(retrieved[0].averageResponseTime).toBe(2.5);
    });

    it('should get bot metrics', async () => {
      await manager.updateBotMetrics({
        botName: 'get-metrics-bot',
        messagesSent: 50,
        messagesReceived: 75,
        conversationsHandled: 10,
        averageResponseTime: 1.8,
        lastActivity: new Date(),
        provider: 'slack'
      } as BotMetrics);

      const metrics = await manager.getBotMetrics('get-metrics-bot');
      expect(metrics.length).toBe(1);
      expect(metrics[0].provider).toBe('slack');
    });

    it('should get all bot metrics', async () => {
      await manager.updateBotMetrics({
        botName: 'all-metrics1',
        messagesSent: 10,
        messagesReceived: 20,
        conversationsHandled: 5,
        averageResponseTime: 3.0,
        lastActivity: new Date(),
        provider: 'discord'
      } as BotMetrics);

      await manager.updateBotMetrics({
        botName: 'all-metrics2',
        messagesSent: 30,
        messagesReceived: 40,
        conversationsHandled: 8,
        averageResponseTime: 2.2,
        lastActivity: new Date(),
        provider: 'openai'
      } as BotMetrics);

      const allMetrics = await manager.getBotMetrics();
      expect(allMetrics.length).toBe(2);
    });
  });

  describe('Message Storage', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should store and retrieve message', async () => {
      const message: MessageRecord = {
        messageId: 'msg-test-1',
        channelId: 'test-channel-msg',
        content: 'Test message content',
        authorId: 'user123',
        authorName: 'Test User',
        timestamp: new Date(),
        provider: 'discord',
        metadata: { attachments: [] }
      };

      const id = await manager.storeMessage(message);
      expect(id).toBeGreaterThan(0);

      const history = await manager.getMessageHistory('test-channel-msg');
      expect(history.length).toBe(1);
      expect(history[0].messageId).toBe('msg-test-1');
      expect(history[0].content).toBe('Test message content');
    });

    it('should handle message without metadata', async () => {
      const message: MessageRecord = {
        messageId: 'no-meta-msg',
        channelId: 'no-meta-channel',
        content: 'Simple message',
        authorId: 'user456',
        authorName: 'Simple User',
        timestamp: new Date(),
        provider: 'slack'
      };

      const id = await manager.storeMessage(message);
      expect(id).toBeGreaterThan(0);

      const history = await manager.getMessageHistory('no-meta-channel');
      expect(history[0].metadata).toBeUndefined();
    });
  });

  describe('Error Handling for CRUD', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should handle invalid bot config creation', async () => {
      const invalidConfig: Partial<BotConfiguration> = {
        name: '', // Invalid empty name
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(manager.createBotConfiguration(invalidConfig as BotConfiguration)).rejects.toThrow();
    });

    it('should handle anomaly storage with invalid data', async () => {
      const invalidAnomaly: Partial<Anomaly> = {
        id: '',
        timestamp: new Date(),
        metric: 'test',
        value: -1, // Invalid negative value
        expectedMean: 0,
        standardDeviation: 0,
        zScore: 0,
        threshold: 0,
        severity: 'invalid' as any, // Invalid severity
        explanation: 'test'
      };

      await expect(manager.storeAnomaly(invalidAnomaly as Anomaly)).rejects.toThrow();
    });
  });
});