import 'reflect-metadata';
import { DatabaseManager, type BotConfiguration } from '../../../src/database/DatabaseManager';

describe('Database Query Optimization Integration', () => {
  let dbManager: DatabaseManager;

  beforeAll(async () => {
    // Reset singleton
    (DatabaseManager as any).instance = null;
    
    dbManager = DatabaseManager.getInstance({
      type: 'sqlite',
      path: ':memory:',
    });
    await dbManager.connect();
  });

  afterAll(async () => {
    await dbManager.disconnect();
  });

  it('should efficiently load bot configurations with versions and audit logs', async () => {
    // Setup data
    const config: BotConfiguration = {
      name: 'Optimized Bot',
      messageProvider: 'discord',
      llmProvider: 'openai',
      isActive: true
    };
    
    const botId = await dbManager.createBotConfiguration(config);
    
    // Add version
    await dbManager.updateBotConfiguration(botId, { 
      ...config, 
      persona: 'New Persona' 
    });
    
    // Add audit log
    await dbManager.createBotConfigurationAudit({
      configId: botId,
      action: 'UPDATE',
      changedBy: 'admin',
      details: 'Update test'
    });

    const results = await dbManager.getAllBotConfigurationsWithDetails();

    expect(results.length).toBeGreaterThanOrEqual(1);
    const bot = results.find(b => b.id === botId);
    
    expect(bot).toBeDefined();
    expect(bot!.versions).toBeDefined();
    expect(bot!.auditLog).toBeDefined();
  });
});
