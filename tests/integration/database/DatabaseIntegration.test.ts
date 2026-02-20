/**
 * Database Integration Tests
 * Tests real database operations with SQLite
 */

import { DatabaseManager } from '../../../src/database/DatabaseManager';
import { UserConfigStore } from '../../../src/config/UserConfigStore';
import path from 'path';

describe('Database Integration Tests', () => {
  let dbManager: DatabaseManager;
  let userConfigStore: UserConfigStore;
  let testDbPath: string;

  beforeAll(async () => {
    // Use a test-specific database file
    testDbPath = path.join(process.cwd(), 'test-data', 'integration-test.db');

    // Initialize database manager with test database
    dbManager = DatabaseManager.getInstance();
    await dbManager.initialize(testDbPath);

    // Initialize user config store
    userConfigStore = UserConfigStore.getInstance();
  });

  afterAll(async () => {
    // Clean up test database
    if (dbManager) {
      await dbManager.close();
    }

    // Clean up test database file
    try {
      const fs = require('fs').promises;
      await fs.unlink(testDbPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  beforeEach(async () => {
    // Clear all tables before each test
    const db = dbManager.getDatabase();
    await db.exec(`
      DELETE FROM user_configs;
      DELETE FROM bot_configs;
      DELETE FROM message_history;
      DELETE FROM analytics_events;
    `);
  });

  describe('UserConfigStore Integration', () => {
    it('should persist and retrieve user configuration', async () => {
      const testConfig = {
        botName: 'test-bot',
        config: {
          MESSAGE_PROVIDER: 'discord',
          LLM_PROVIDER: 'openai',
          DISCORD_BOT_TOKEN: 'test-token'
        }
      };

      // Save configuration
      await userConfigStore.saveBotConfig(testConfig.botName, testConfig.config);

      // Retrieve configuration
      const retrievedConfig = await userConfigStore.getBotConfig(testConfig.botName);

      expect(retrievedConfig).toEqual(testConfig.config);
    });

    it('should handle multiple bot configurations', async () => {
      const configs = [
        {
          botName: 'bot1',
          config: { MESSAGE_PROVIDER: 'discord', LLM_PROVIDER: 'openai' }
        },
        {
          botName: 'bot2',
          config: { MESSAGE_PROVIDER: 'slack', LLM_PROVIDER: 'flowise' }
        },
        {
          botName: 'bot3',
          config: { MESSAGE_PROVIDER: 'mattermost', LLM_PROVIDER: 'openwebui' }
        }
      ];

      // Save all configurations
      for (const config of configs) {
        await userConfigStore.saveBotConfig(config.botName, config.config);
      }

      // Retrieve and verify all configurations
      for (const expected of configs) {
        const actual = await userConfigStore.getBotConfig(expected.botName);
        expect(actual).toEqual(expected.config);
      }
    });

    it('should update existing configurations', async () => {
      const botName = 'update-test-bot';
      const initialConfig = { MESSAGE_PROVIDER: 'discord' };
      const updatedConfig = {
        MESSAGE_PROVIDER: 'slack',
        LLM_PROVIDER: 'openai',
        DISCORD_BOT_TOKEN: 'updated-token'
      };

      // Save initial config
      await userConfigStore.saveBotConfig(botName, initialConfig);

      // Update config
      await userConfigStore.saveBotConfig(botName, updatedConfig);

      // Verify update
      const retrieved = await userConfigStore.getBotConfig(botName);
      expect(retrieved).toEqual(updatedConfig);
    });

    it('should return null for non-existent configurations', async () => {
      const config = await userConfigStore.getBotConfig('non-existent-bot');
      expect(config).toBeNull();
    });

    it('should handle complex nested configurations', async () => {
      const botName = 'complex-bot';
      const complexConfig = {
        MESSAGE_PROVIDER: 'discord',
        LLM_PROVIDER: 'openai',
        DISCORD_CONFIG: {
          BOT_TOKEN: 'token123',
          GUILD_ID: 'guild456',
          CHANNELS: ['chan1', 'chan2', 'chan3']
        },
        FEATURES: {
          VOICE_COMMANDS: true,
          IMAGE_PROCESSING: false,
          WEBHOOK_INTEGRATION: {
            ENABLED: true,
            URLS: ['https://example.com/hook1', 'https://example.com/hook2']
          }
        },
        PERFORMANCE: {
          RATE_LIMIT: 10,
          TIMEOUT: 30000,
          RETRY_ATTEMPTS: 3
        }
      };

      await userConfigStore.saveBotConfig(botName, complexConfig);
      const retrieved = await userConfigStore.getBotConfig(botName);

      expect(retrieved).toEqual(complexConfig);
      expect(retrieved.DISCORD_CONFIG.CHANNELS).toHaveLength(3);
      expect(retrieved.FEATURES.WEBHOOK_INTEGRATION.URLS).toHaveLength(2);
    });
  });

  describe('Database Performance', () => {
    it('should handle multiple rapid read/write operations', async () => {
      const operations = 100;
      const botName = 'performance-test-bot';

      const startTime = Date.now();

      // Perform multiple save operations
      for (let i = 0; i < operations; i++) {
        const config = {
          MESSAGE_PROVIDER: 'discord',
          ITERATION: i,
          TIMESTAMP: Date.now()
        };
        await userConfigStore.saveBotConfig(`${botName}-${i}`, config);
      }

      // Perform multiple read operations
      for (let i = 0; i < operations; i++) {
        await userConfigStore.getBotConfig(`${botName}-${i}`);
      }

      const totalTime = Date.now() - startTime;
      const operationsPerSecond = (operations * 2) / (totalTime / 1000); // Read + write

      console.log('Database performance:', {
        operations: operations * 2,
        totalTime: `${totalTime}ms`,
        opsPerSecond: operationsPerSecond.toFixed(2)
      });

      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(operationsPerSecond).toBeGreaterThan(10); // At least 10 ops/sec
    });

    it('should handle concurrent database operations', async () => {
      const concurrentOperations = 20;
      const botName = 'concurrent-test-bot';

      const promises = Array(concurrentOperations).fill(null).map(async (_, index) => {
        const config = {
          MESSAGE_PROVIDER: 'discord',
          INDEX: index,
          TIMESTAMP: Date.now()
        };

        // Save config
        await userConfigStore.saveBotConfig(`${botName}-${index}`, config);

        // Immediately read it back
        const retrieved = await userConfigStore.getBotConfig(`${botName}-${index}`);

        return { saved: config, retrieved };
      });

      const results = await Promise.all(promises);

      // Verify all operations completed successfully
      results.forEach((result, index) => {
        expect(result.retrieved).toEqual(result.saved);
        expect(result.retrieved.INDEX).toBe(index);
      });
    });
  });

  describe('Database Reliability', () => {
    it('should maintain data integrity across restarts', async () => {
      const botName = 'persistence-test-bot';
      const testData = {
        MESSAGE_PROVIDER: 'discord',
        PERSISTENCE_TEST: true,
        TIMESTAMP: Date.now()
      };

      // Save data
      await userConfigStore.saveBotConfig(botName, testData);

      // Simulate restart by creating new instance
      const newUserConfigStore = new UserConfigStore();
      await newUserConfigStore.initialize();

      // Data should still be available
      const retrieved = await newUserConfigStore.getBotConfig(botName);
      expect(retrieved).toEqual(testData);
    });

    it('should handle large configuration objects', async () => {
      const botName = 'large-config-bot';
      const largeConfig = {
        MESSAGE_PROVIDER: 'discord',
        LARGE_DATA: 'x'.repeat(10000), // 10KB string
        ARRAY_DATA: Array.from({ length: 1000 }, (_, i) => ({ index: i, data: `item${i}` })),
        NESTED_OBJECT: {
          level1: {
            level2: {
              level3: {
                largeArray: Array.from({ length: 100 }, (_, i) => `nested-item-${i}`),
                largeString: 'y'.repeat(5000)
              }
            }
          }
        }
      };

      await userConfigStore.saveBotConfig(botName, largeConfig);
      const retrieved = await userConfigStore.getBotConfig(botName);

      expect(retrieved).toEqual(largeConfig);
      expect(retrieved.LARGE_DATA).toHaveLength(10000);
      expect(retrieved.ARRAY_DATA).toHaveLength(1000);
    });

    it('should handle database connection errors gracefully', async () => {
      // Close the database connection
      await dbManager.close();

      // Attempt operations on closed connection
      await expect(userConfigStore.saveBotConfig('test', { data: 'test' }))
        .rejects.toThrow();

      await expect(userConfigStore.getBotConfig('test'))
        .rejects.toThrow();

      // Reinitialize for cleanup
      await dbManager.initialize(testDbPath);
    });
  });

  describe('Data Migration and Schema Compatibility', () => {
    it('should handle schema evolution', async () => {
      const botName = 'schema-test-bot';

      // Save with initial schema
      const initialConfig = {
        MESSAGE_PROVIDER: 'discord',
        LLM_PROVIDER: 'openai'
      };
      await userConfigStore.saveBotConfig(botName, initialConfig);

      // Retrieve and extend with new fields
      const retrieved = await userConfigStore.getBotConfig(botName);
      const extendedConfig = {
        ...retrieved,
        NEW_FIELD: 'added later',
        FEATURES: ['voice', 'images', 'webhooks']
      };

      // Save extended config
      await userConfigStore.saveBotConfig(botName, extendedConfig);

      // Verify extended config is preserved
      const final = await userConfigStore.getBotConfig(botName);
      expect(final).toEqual(extendedConfig);
      expect(final.NEW_FIELD).toBe('added later');
      expect(final.FEATURES).toEqual(['voice', 'images', 'webhooks']);
    });
  });
});