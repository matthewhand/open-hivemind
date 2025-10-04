import { ConfigurationVersionService } from '@src/server/services/ConfigurationVersionService';
import { DatabaseManager } from '@src/database/DatabaseManager';

describe('ConfigurationVersionService', () => {
  let service: ConfigurationVersionService;
  let dbManager: DatabaseManager;

  beforeEach(async () => {
    dbManager = DatabaseManager.getInstance({ type: 'sqlite', path: ':memory:' });
    await dbManager.connect();
    service = ConfigurationVersionService.getInstance();
  });

  afterEach(async () => {
    if (dbManager.isConnected()) {
      await dbManager.disconnect();
    }
    // Clear singleton instances for clean tests
    (DatabaseManager as any).instance = null;
    (ConfigurationVersionService as any).instance = null;
  });

  describe('Version Deletion', () => {
    it('should delete a configuration version successfully', async () => {
      // Create a test configuration
      const configId = await dbManager.createBotConfiguration({
        name: 'test-config',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create test versions
      await dbManager.createBotConfigurationVersion({
        botConfigurationId: configId,
        version: '1.0.0',
        name: 'test-config',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        createdBy: 'test-user'
      });

      await dbManager.createBotConfigurationVersion({
        botConfigurationId: configId,
        version: '2.0.0',
        name: 'test-config',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        createdBy: 'test-user'
      });

      // Delete version 1.0.0
      const deleted = await service.deleteVersion(configId, '1.0.0');
      expect(deleted).toBe(true);

      // Verify deletion
      const versions = await dbManager.getBotConfigurationVersions(configId);
      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe('2.0.0');

      // Verify audit log was created
      const auditLogs = await dbManager.getBotConfigurationAudit(configId);
      const deleteAudit = auditLogs.find(log => 
        log.action === 'DELETE' && 
        log.oldValues?.includes('1.0.0')
      );
      expect(deleteAudit).toBeDefined();
    });

    it('should throw error when trying to delete the only version', async () => {
      // Create a test configuration
      const configId = await dbManager.createBotConfiguration({
        name: 'test-config',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create only one version
      await dbManager.createBotConfigurationVersion({
        botConfigurationId: configId,
        version: '1.0.0',
        name: 'test-config',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        createdBy: 'test-user'
      });

      // Try to delete the only version
      await expect(
        service.deleteVersion(configId, '1.0.0')
      ).rejects.toThrow('Cannot delete the only version of a configuration');
    });

    it('should throw error when trying to delete non-existent version', async () => {
      // Create a test configuration
      const configId = await dbManager.createBotConfiguration({
        name: 'test-config',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create one version
      await dbManager.createBotConfigurationVersion({
        botConfigurationId: configId,
        version: '1.0.0',
        name: 'test-config',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        createdBy: 'test-user'
      });

      // Try to delete non-existent version
      await expect(
        service.deleteVersion(configId, '2.0.0')
      ).rejects.toThrow('Failed to delete configuration version');
    });

    it('should handle database errors gracefully', async () => {
      // Disconnect database to simulate error
      await dbManager.disconnect();

      await expect(
        service.deleteVersion(1, '1.0.0')
      ).rejects.toThrow('Failed to delete configuration version');
    });
  });

  describe('Version History', () => {
    it('should get version history', async () => {
      // Create a test configuration
      const configId = await dbManager.createBotConfiguration({
        name: 'test-config',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create test versions
      await dbManager.createBotConfigurationVersion({
        botConfigurationId: configId,
        version: '1.0.0',
        name: 'test-config',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        createdBy: 'test-user'
      });

      await dbManager.createBotConfigurationVersion({
        botConfigurationId: configId,
        version: '2.0.0',
        name: 'test-config',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        createdBy: 'test-user'
      });

      // Get version history
      const history = await service.getVersionHistory(configId);
      expect(history.versions).toHaveLength(2);
      expect(history.total).toBe(2);
      expect(history.versions[0].version).toBe('2.0.0'); // Should be sorted by creation date desc
      expect(history.versions[1].version).toBe('1.0.0');
    });
  });
});