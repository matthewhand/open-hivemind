import { ConfigurationVersionService } from '../../../src/server/services/ConfigurationVersionService';
import { DatabaseManager } from '../../../src/database/DatabaseManager';

describe('ConfigurationVersionService Integration', () => {
  let service: ConfigurationVersionService;
  let mockDb: any;
  
  beforeAll(() => {
    const mockVersions = [
      {
        id: 1,
        botConfigurationId: 10,
        version: 'v1.0.0',
        name: 'Bot',
        messageProvider: 'slack',
        llmProvider: 'openai',
        systemPrompt: 'Hello',
        createdAt: '2023-01-01',
      },
      {
        id: 2,
        botConfigurationId: 10,
        version: 'v1.1.0',
        name: 'Bot V2',
        messageProvider: 'slack',
        llmProvider: 'openai',
        systemPrompt: 'Hello World',
        createdAt: '2023-01-02',
      }
    ];

    let currentConfig = { id: 10, name: 'Bot V2' };

    mockDb = {
      getBotConfigurationVersions: jest.fn().mockResolvedValue(mockVersions),
      getBotConfiguration: jest.fn().mockImplementation((id) => {
        if (id === 10) return Promise.resolve(currentConfig);
        return Promise.resolve(null);
      }),
      updateBotConfiguration: jest.fn().mockImplementation((id, data) => {
        currentConfig = { ...currentConfig, ...data };
        return Promise.resolve(true);
      }),
      createBotConfigurationAudit: jest.fn().mockResolvedValue(1),
      getBotConfigurationAudit: jest.fn().mockResolvedValue([
        {
          action: 'UPDATE',
          oldValues: JSON.stringify({ restoredFrom: 'v1.0.0' }),
          performedBy: 'janitor-user'
        }
      ]),
      getInstance: jest.fn().mockReturnThis(),
      isConfigured: jest.fn().mockReturnValue(true),
    };

    jest.spyOn(DatabaseManager, 'getInstance').mockReturnValue(mockDb as any);
    
    // Reset singleton if it exists
    (ConfigurationVersionService as any).instance = null;
    service = ConfigurationVersionService.getInstance();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should compare two versions and correctly identify differences', async () => {
    const result = await service.compareVersions(10, 'v1.0.0', 'v1.1.0');
    
    expect(result).toBeDefined();
    expect(result.version1.version).toBe('v1.0.0');
    expect(result.version2.version).toBe('v1.1.0');
    
    // Name changed from 'Bot' to 'Bot V2'
    const nameDiff = result.differences.find((d: any) => d.path === 'name');
    expect(nameDiff).toBeDefined();
    expect(nameDiff?.oldValue).toBe('Bot');
    expect(nameDiff?.newValue).toBe('Bot V2');
  });

  it('should restore a version successfully and include restoredBy in audit log', async () => {
    const restored = await service.restoreVersion(10, 'v1.0.0', 'janitor-user');
    expect(restored.name).toBe('Bot'); // Restored name
    
    // Verify audit log
    const audits = await mockDb.getBotConfigurationAudit(10);
    const restoreAudit = audits.find(
      (a: any) => a.action === 'UPDATE' && a.oldValues && a.oldValues.includes('restoredFrom')
    );
    expect(restoreAudit).toBeDefined();
    expect(restoreAudit?.performedBy).toBe('janitor-user');
  });
});
