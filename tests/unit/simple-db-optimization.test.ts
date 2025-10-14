/**
 * Simple test for database optimization
 */

import {
  DatabaseManager,
  BotConfiguration
} from '../../src/database/DatabaseManager';

describe('Database Query Optimization', () => {
  let dbManager: DatabaseManager;

  beforeEach(async () => {
    dbManager = DatabaseManager.getInstance({
      type: 'sqlite',
      path: ':memory:'
    });
    await dbManager.connect();
  });

  afterEach(async () => {
    await dbManager.disconnect();
  });

  test('should create and retrieve bot configurations', async () => {
    // Create a test configuration
    const config: BotConfiguration = {
      name: 'Test Bot',
      messageProvider: 'discord',
      llmProvider: 'openai',
      persona: 'test-persona',
      systemInstruction: 'Test instruction',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const id = await dbManager.createBotConfiguration(config);
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);

    // Retrieve the configuration
    const retrieved = await dbManager.getBotConfiguration(id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('Test Bot');
  });

  test('should use bulk query method correctly', async () => {
    // Create multiple configurations
    const configs: BotConfiguration[] = [];
    for (let i = 1; i <= 3; i++) {
      const config: BotConfiguration = {
        name: `Test Bot ${i}`,
        messageProvider: i % 2 === 0 ? 'discord' : 'slack',
        llmProvider: 'openai',
        persona: `test-persona-${i}`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      configs.push(config);
    }

    // Create all configurations
    const ids = [];
    for (const config of configs) {
      const id = await dbManager.createBotConfiguration(config);
      ids.push(id);
    }

    // Test bulk method
    const results = await dbManager.getAllBotConfigurationsWithDetails();
    expect(results.length).toBe(3);

    // Verify structure
    results.forEach(result => {
      expect(result).toHaveProperty('versions');
      expect(result).toHaveProperty('auditLog');
      expect(Array.isArray(result.versions)).toBe(true);
      expect(Array.isArray(result.auditLog)).toBe(true);
    });
  });

  test('should handle empty database with bulk method', async () => {
    const results = await dbManager.getAllBotConfigurationsWithDetails();
    expect(results).toEqual([]);
  });
});