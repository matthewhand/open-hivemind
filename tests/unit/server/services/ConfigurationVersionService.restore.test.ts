import { ConfigurationVersionService } from '../../../../src/server/services/ConfigurationVersionService';
import { DatabaseManager } from '../../../../src/database/DatabaseManager';

describe('ConfigurationVersionService Restore', () => {
  let service: ConfigurationVersionService;
  let dbManager: DatabaseManager;

  beforeEach(async () => {
    // Reset singletons
    (DatabaseManager as any).instance = null;
    (ConfigurationVersionService as any).instance = null;

    dbManager = DatabaseManager.getInstance({ type: 'sqlite', path: ':memory:' });
    await dbManager.connect();
    service = ConfigurationVersionService.getInstance();
  });

  afterEach(async () => {
    if (dbManager.isConnected()) {
      await dbManager.disconnect();
    }
    (DatabaseManager as any).instance = null;
    (ConfigurationVersionService as any).instance = null;
  });

  it('should include restoredBy in audit log when restoring a version', async () => {
    // 1. Create a bot config
    const configId = await dbManager.createBotConfiguration({
      name: 'test-bot',
      messageProvider: 'discord',
      llmProvider: 'openai',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'creator'
    });

    // 2. Create a version (v1)
    await dbManager.createBotConfigurationVersion({
      botConfigurationId: configId,
      version: '1.0.0',
      name: 'test-bot',
      messageProvider: 'discord',
      llmProvider: 'openai',
      isActive: true,
      createdAt: new Date(),
      createdBy: 'creator'
    });

    // 3. Restore v1 with a specific user
    const restoredBy = 'janitor-user';
    await service.restoreVersion(configId, '1.0.0', restoredBy);

    // 4. Verify audit log
    const audits = await dbManager.getBotConfigurationAudit(configId);
    // The audit log for restore has action 'UPDATE' and oldValues contains 'restoredFrom'
    const restoreAudit = audits.find(a => a.action === 'UPDATE' && a.oldValues && a.oldValues.includes('restoredFrom'));

    expect(restoreAudit).toBeDefined();
    expect(restoreAudit?.performedBy).toBe(restoredBy);
  });
});
