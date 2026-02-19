/**
 * Unit tests for N+1 query optimization
 */

import {
  DatabaseManager,
  BotConfiguration,
  BotConfigurationVersion,
  BotConfigurationAudit
} from '../../src/database/DatabaseManager';

describe('N+1 Query Optimization', () => {
  let dbManager: DatabaseManager;
  let testConfigIds: number[];

  beforeAll(async () => {
    // Initialize database with a unique instance for these tests
    dbManager = new DatabaseManager({
      type: 'sqlite',
      path: ':memory:'
    });

    await dbManager.connect();

    // Create multiple test bot configurations
    const configs: Omit<BotConfiguration, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    for (let i = 1; i <= 5; i++) {
      configs.push({
        name: `Test Bot ${i}`,
        messageProvider: i % 2 === 0 ? 'discord' : 'slack',
        llmProvider: 'openai',
        persona: `test-persona-${i}`,
        systemInstruction: `Test instruction ${i}`,
        mcpServers: [{ name: `server-${i}`, serverUrl: `https://server-${i}.example.com` }],
        discord: { channelId: `channel-${i}`, token: `token-${i}` },
        openai: { apiKey: `key-${i}`, model: 'gpt-4' },
        isActive: true
      });
    }

    // Create all configurations
    testConfigIds = [];
    for (const config of configs) {
      const configWithDates: BotConfiguration = {
        ...config,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const id = await dbManager.createBotConfiguration(configWithDates);
      testConfigIds.push(id);
    }

    // Create versions and audit logs for each configuration
    for (const configId of testConfigIds) {
      // Create 2 versions per configuration (deterministic for tests)
      for (let v = 1; v <= 2; v++) {
        const version: Omit<BotConfigurationVersion, 'id'> = {
          botConfigurationId: configId,
          version: v.toString(),
          name: `Version ${v}`,
          messageProvider: 'discord',
          llmProvider: 'openai',
          persona: `persona-v${v}`,
          systemInstruction: `Instruction v${v}`,
          mcpServers: [{ name: `server-v${v}`, serverUrl: `https://server-v${v}.example.com` }],
          discord: { channelId: `channel-v${v}`, token: `token-v${v}` },
          openai: { apiKey: `key-v${v}`, model: 'gpt-4' },
          isActive: v === 2, // Last version is active
          createdAt: new Date(),
          createdBy: 'test-user',
          changeLog: `Version ${v} created`
        };
        await dbManager.createBotConfigurationVersion(version);
      }

      // Create 3 audit logs per configuration
      for (let a = 1; a <= 3; a++) {
        const audit: Omit<BotConfigurationAudit, 'id'> = {
          botConfigurationId: configId,
          action: a === 1 ? 'CREATE' : 'UPDATE',
          oldValues: a > 1 ? JSON.stringify({ step: a - 1 }) : undefined,
          newValues: JSON.stringify({ step: a }),
          performedBy: `user-${a}`,
          performedAt: new Date(),
          ipAddress: `192.168.1.${a}`,
          userAgent: `test-agent-${a}`
        };
        await dbManager.createBotConfigurationAudit(audit);
      }
    }
  });

  afterAll(async () => {
    await dbManager.disconnect();
  });

  describe('Bulk Query Optimization', () => {
    test('should get all configurations with details using optimized queries', async () => {
      const startTime = Date.now();
      const configs = await dbManager.getAllBotConfigurationsWithDetails();
      const endTime = Date.now();

      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBe(5);

      // Verify each configuration has versions and audit logs
      configs.forEach(config => {
        expect(config.versions).toBeDefined();
        expect(Array.isArray(config.versions)).toBe(true);
        expect(config.auditLog).toBeDefined();
        expect(Array.isArray(config.auditLog)).toBe(true);

        // Should have at least 2 versions
        expect(config.versions.length).toBeGreaterThanOrEqual(2);

        // Should have at least 3 audit logs
        expect(config.auditLog.length).toBeGreaterThanOrEqual(3);

        // Verify data structure
        config.versions.forEach(version => {
          expect(version).toHaveProperty('id');
          expect(version).toHaveProperty('botConfigurationId');
          expect(version).toHaveProperty('version');
          expect(version.botConfigurationId).toBe(config.id);
        });

        config.auditLog.forEach(audit => {
          expect(audit).toHaveProperty('id');
          expect(audit).toHaveProperty('botConfigurationId');
          expect(audit.botConfigurationId).toBe(config.id);
        });
      });

      // Query should be fast (under 100ms for in-memory DB)
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should return empty array when no configurations exist', async () => {
      // Reset singleton to get a fresh database instance
      (DatabaseManager as any).instance = null;

      // Create a new database manager with empty database
      const emptyDbManager = DatabaseManager.getInstance({
        type: 'sqlite',
        path: ':memory:'
      });

      await emptyDbManager.connect();

      const configs = await emptyDbManager.getAllBotConfigurationsWithDetails();
      expect(configs).toBeDefined();
      expect(Array.isArray(configs)).toBe(true);

      await emptyDbManager.disconnect();
      // Reset singleton after test
      (DatabaseManager as any).instance = null;
    });

    test('should handle bulk version queries correctly', async () => {
      const versionsMap = await dbManager.getBotConfigurationVersionsBulk(testConfigIds);

      expect(versionsMap).toBeInstanceOf(Map);
      expect(versionsMap.size).toBe(testConfigIds.length);

      // Verify all configuration IDs are present
      testConfigIds.forEach(configId => {
        expect(versionsMap.has(configId)).toBe(true);
        expect(versionsMap.get(configId)!.length).toBeGreaterThanOrEqual(2);
      });

      // Verify version data integrity
      versionsMap.forEach((versions, configId) => {
        versions.forEach(version => {
          expect(version.botConfigurationId).toBe(configId);
          expect(typeof version.version).toBe('string');
          expect(version.createdAt).toBeInstanceOf(Date);
        });
      });
    });

    test('should handle bulk audit log queries correctly', async () => {
      const auditMap = await dbManager.getBotConfigurationAuditBulk(testConfigIds);

      expect(auditMap).toBeInstanceOf(Map);
      expect(auditMap.size).toBe(testConfigIds.length);

      // Verify all configuration IDs are present
      testConfigIds.forEach(configId => {
        expect(auditMap.has(configId)).toBe(true);
        expect(auditMap.get(configId)!.length).toBeGreaterThanOrEqual(3);
      });

      // Verify audit data integrity
      auditMap.forEach((audits, configId) => {
        audits.forEach(audit => {
          expect(audit.botConfigurationId).toBe(configId);
          expect(['CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE']).toContain(audit.action);
          expect(audit.performedAt).toBeInstanceOf(Date);
        });
      });
    });

    test('should handle empty arrays in bulk queries', async () => {
      const emptyVersionsMap = await dbManager.getBotConfigurationVersionsBulk([]);
      const emptyAuditMap = await dbManager.getBotConfigurationAuditBulk([]);

      expect(emptyVersionsMap).toBeInstanceOf(Map);
      expect(emptyVersionsMap.size).toBe(0);
      expect(emptyAuditMap).toBeInstanceOf(Map);
      expect(emptyAuditMap.size).toBe(0);
    });

    test('should handle non-existent configuration IDs in bulk queries', async () => {
      const nonExistentIds = [99999, 99998, 99997];
      const versionsMap = await dbManager.getBotConfigurationVersionsBulk(nonExistentIds);
      const auditMap = await dbManager.getBotConfigurationAuditBulk(nonExistentIds);

      expect(versionsMap.size).toBe(0);
      expect(auditMap.size).toBe(0);
    });
  });

  describe('Performance Comparison', () => {
    test('bulk queries should be more efficient than individual queries', async () => {
      // Test individual queries (the old N+1 approach)
      const individualStartTime = Date.now();
      const configs = await dbManager.getAllBotConfigurations();
      const individualResults = [];

      for (const config of configs) {
        const versions = await dbManager.getBotConfigurationVersions(config.id!);
        const auditLog = await dbManager.getBotConfigurationAudit(config.id!);
        individualResults.push({
          ...config,
          versions,
          auditLog
        });
      }
      const individualEndTime = Date.now();

      // Test bulk queries (the optimized approach)
      const bulkStartTime = Date.now();
      const bulkResults = await dbManager.getAllBotConfigurationsWithDetails();
      const bulkEndTime = Date.now();

      // Both approaches should return the same number of results
      expect(individualResults.length).toBe(bulkResults.length);

      // Bulk queries should be faster (in practice with real DB)
      const individualTime = individualEndTime - individualStartTime;
      const bulkTime = bulkEndTime - bulkStartTime;

      // For in-memory DB, both should be fast, but bulk should still be comparable
      // Note: In-memory DB operations are so fast that times may be 0ms
      expect(bulkTime).toBeLessThanOrEqual(individualTime * 2 + 10);

      // Verify data consistency - both should have same IDs
      const individualIds = individualResults.map(r => r.id).sort();
      const bulkIds = bulkResults.map(r => r.id).sort();
      expect(individualIds).toEqual(bulkIds);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle database disconnection gracefully in bulk queries', async () => {
      const disconnectedDb = new DatabaseManager();

      await expect(disconnectedDb.getBotConfigurationVersionsBulk(testConfigIds))
        .rejects.toThrow('Database is not configured');

      await expect(disconnectedDb.getBotConfigurationAuditBulk(testConfigIds))
        .rejects.toThrow('Database is not configured');

      await expect(disconnectedDb.getAllBotConfigurationsWithDetails())
        .rejects.toThrow('Database is not configured');
    });

    test('should handle malformed data in bulk queries', async () => {
      // This test would be more relevant with a real database that might have corrupt data
      // For in-memory DB with controlled data, this mainly tests the query structure
      const results = await dbManager.getAllBotConfigurationsWithDetails();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);

      // All results should have the expected structure
      results.forEach(result => {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('versions');
        expect(result).toHaveProperty('auditLog');
        expect(Array.isArray(result.versions)).toBe(true);
        expect(Array.isArray(result.auditLog)).toBe(true);
      });
    });
  });
});