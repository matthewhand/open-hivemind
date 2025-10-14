/**
 * Integration tests for configuration version deletion functionality
 */

import { DatabaseManager } from '../../src/database/DatabaseManager';
import { ConfigurationVersionService } from '../../src/server/services/ConfigurationVersionService';
import { BotConfiguration } from '../../src/database/DatabaseManager';

describe('Configuration Version Deletion', () => {
  let dbManager: DatabaseManager;
  let versionService: ConfigurationVersionService;
  let testConfigId: number;

  beforeAll(async () => {
    // Initialize database and services
    dbManager = DatabaseManager.getInstance({
      type: 'sqlite',
      path: ':memory:'
    });

    await dbManager.connect();
    versionService = ConfigurationVersionService.getInstance();

    // Create a test bot configuration
    const testConfig: BotConfiguration = {
      name: 'Test Bot for Version Deletion',
      messageProvider: 'discord',
      llmProvider: 'openai',
      persona: 'test-persona',
      systemInstruction: 'Test instruction',
      mcpServers: [],
      discord: { channelId: 'test-channel' },
      slack: { botToken: 'test-token' },
      mattermost: { url: 'test-url' },
      openai: { apiKey: 'test-key' },
      flowise: { apiUrl: 'test-api' },
      openwebui: { apiUrl: 'test-api' },
      openswarm: { apiUrl: 'test-api' },
      perplexity: { apiKey: 'test-key' },
      replicate: { apiKey: 'test-key' },
      n8n: { apiUrl: 'test-api' },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    testConfigId = await dbManager.createBotConfiguration(testConfig);
  });

  afterAll(async () => {
    await dbManager.disconnect();
  });

  describe('Version Creation', () => {
    test('should create multiple versions', async () => {
      // Create version 1.0
      await versionService.createVersion({
        botConfigurationId: testConfigId,
        version: '1.0.0',
        changeLog: 'Initial version',
        createdBy: 'test-user'
      });

      // Create version 1.1
      await versionService.createVersion({
        botConfigurationId: testConfigId,
        version: '1.1.0',
        changeLog: 'Added new features',
        createdBy: 'test-user'
      });

      // Create version 1.2
      await versionService.createVersion({
        botConfigurationId: testConfigId,
        version: '1.2.0',
        changeLog: 'Bug fixes',
        createdBy: 'test-user'
      });

      const history = await versionService.getVersionHistory(testConfigId);
      expect(history.versions).toHaveLength(3);
      expect(history.total).toBe(3);
    });
  });

  describe('Version Deletion', () => {
    test('should not allow deletion of only version', async () => {
      // Create a config with only one version
      const singleVersionConfig: BotConfiguration = {
        name: 'Single Version Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const configId = await dbManager.createBotConfiguration(singleVersionConfig);
      await versionService.createVersion({
        botConfigurationId: configId,
        version: '1.0.0',
        changeLog: 'Only version',
        createdBy: 'test-user'
      });

      // Try to delete the only version
      await expect(
        versionService.deleteVersion(configId, '1.0.0')
      ).rejects.toThrow('Cannot delete the only version of a configuration');
    });

    test('should delete a non-active version successfully', async () => {
      // Get current versions
      const beforeHistory = await versionService.getVersionHistory(testConfigId);
      expect(beforeHistory.versions).toHaveLength(3);

      // Delete version 1.1 (not the latest)
      const deleteResult = await versionService.deleteVersion(testConfigId, '1.1.0');
      expect(deleteResult).toBe(true);

      // Verify deletion
      const afterHistory = await versionService.getVersionHistory(testConfigId);
      expect(afterHistory.versions).toHaveLength(2);
      expect(afterHistory.versions.find(v => v.version === '1.1.0')).toBeUndefined();

      // Verify other versions still exist
      expect(afterHistory.versions.find(v => v.version === '1.0.0')).toBeDefined();
      expect(afterHistory.versions.find(v => v.version === '1.2.0')).toBeDefined();
    });

    test('should not allow deletion of currently active version', async () => {
      // Get current config to see what's active
      const currentConfig = await dbManager.getBotConfiguration(testConfigId);
      expect(currentConfig).toBeDefined();

      // The latest version should be considered active
      const history = await versionService.getVersionHistory(testConfigId);
      const latestVersion = history.versions[0]; // Versions are sorted by date descending

      // Try to delete the active version
      await expect(
        versionService.deleteVersion(testConfigId, latestVersion.version)
      ).rejects.toThrow('Cannot delete the currently active version');
    });

    test('should create audit log entry for version deletion', async () => {
      // Create another version to delete
      await versionService.createVersion({
        botConfigurationId: testConfigId,
        version: '1.3.0',
        changeLog: 'Temporary version for testing',
        createdBy: 'test-user'
      });

      // Delete the version
      await versionService.deleteVersion(testConfigId, '1.3.0');

      // Check audit log
      const auditLog = await versionService.getAuditLog(testConfigId);
      const deleteAuditEntry = auditLog.find(entry =>
        entry.action === 'DELETE' &&
        entry.oldValues?.includes('1.3.0')
      );

      expect(deleteAuditEntry).toBeDefined();
      expect(deleteAuditEntry!.performedAt).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent version gracefully', async () => {
      await expect(
        versionService.deleteVersion(testConfigId, '999.0.0')
      ).rejects.toThrow('Failed to delete configuration version');
    });

    test('should handle non-existent configuration gracefully', async () => {
      await expect(
        versionService.deleteVersion(99999, '1.0.0')
      ).rejects.toThrow('Failed to delete configuration version');
    });
  });

  describe('Database Integrity', () => {
    test('should maintain foreign key constraints', async () => {
      // Verify that deleted versions don't leave orphaned data
      const versions = await dbManager.getBotConfigurationVersions(testConfigId);

      versions.forEach(version => {
        expect(version.botConfigurationId).toBe(testConfigId);
      });
    });

    test('should handle concurrent deletions safely', async () => {
      // Create another version for concurrent testing
      await versionService.createVersion({
        botConfigurationId: testConfigId,
        version: '2.0.0',
        changeLog: 'Concurrent test version',
        createdBy: 'test-user'
      });

      // Try to delete the same version concurrently
      const deletePromises = [
        versionService.deleteVersion(testConfigId, '2.0.0'),
        versionService.deleteVersion(testConfigId, '2.0.0')
      ];

      // One should succeed, one should fail
      const results = await Promise.allSettled(deletePromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
    });
  });
});