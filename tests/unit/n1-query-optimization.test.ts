/**
 * Unit tests for N+1 query optimization
 */

import 'reflect-metadata';

describe('N+1 Query Optimization', () => {
  let dbManager: any;
  let DatabaseManager: any;

  beforeEach(() => {
    jest.resetModules();
    
    // Mock SQLiteWrapper BEFORE requiring DatabaseManager
    jest.doMock('../../src/database/sqliteWrapper', () => {
      return {
        SQLiteWrapper: class {
          async run() { return { lastID: 1, changes: 1 }; }
          async get() { return { id: 1, name: 'TestBot' }; }
          async all(sql: string, params: any[]) {
            // Mock bot configurations
            if (sql.includes('FROM bot_configurations') && !sql.includes('WHERE')) {
              return [
                { id: 1, name: 'Bot 1' },
                { id: 2, name: 'Bot 2' },
                { id: 3, name: 'Bot 3' },
                { id: 4, name: 'Bot 4' },
                { id: 5, name: 'Bot 5' },
              ];
            }
            // Mock versions bulk
            if (sql.includes('IN (') && sql.includes('bot_configuration_versions')) {
              const results: any[] = [];
              const ids = Array.isArray(params) ? params : [params];
              ids.forEach(id => {
                results.push({ id: id * 10 + 1, botConfigurationId: id, version: '1' });
                results.push({ id: id * 10 + 2, botConfigurationId: id, version: '2' });
              });
              return results;
            }
            // Mock audit bulk
            if (sql.includes('IN (') && sql.includes('bot_configuration_audit')) {
              const results: any[] = [];
              const ids = Array.isArray(params) ? params : [params];
              ids.forEach(id => {
                results.push({ id: id * 100 + 1, botConfigurationId: id, action: 'UPDATE', performedAt: new Date().toISOString() });
                results.push({ id: id * 100 + 2, botConfigurationId: id, action: 'UPDATE', performedAt: new Date().toISOString() });
                results.push({ id: id * 100 + 3, botConfigurationId: id, action: 'UPDATE', performedAt: new Date().toISOString() });
              });
              return results;
            }
            return [];
          }
          async exec() { return Promise.resolve(); }
          async configure() { return Promise.resolve(); }
          async close() { return Promise.resolve(); }
          isConnected() { return true; }
        }
      };
    });

    const dmModule = require('../../src/database/DatabaseManager');
    DatabaseManager = dmModule.DatabaseManager;
    // Force reset static instance
    (DatabaseManager as any).instance = null;
    dbManager = DatabaseManager.getInstance({ type: 'sqlite', path: ':memory:' });
  });

  test('should get all configurations with details using optimized queries', async () => {
    await dbManager.connect();
    const configs = await dbManager.getAllBotConfigurationsWithDetails();

    expect(Array.isArray(configs)).toBe(true);
    expect(configs.length).toBe(5);

    configs.forEach((config: any) => {
      expect(config.versions.length).toBe(2);
      expect(config.auditLog.length).toBe(3);
    });
  });

  test('should handle bulk version queries correctly', async () => {
    await dbManager.connect();
    const versionsMap = await dbManager.getBotConfigurationVersionsBulk([1, 2, 3, 4, 5]);

    expect(versionsMap).toBeInstanceOf(Map);
    expect(versionsMap.size).toBe(5);
    expect(versionsMap.get(1)!.length).toBe(2);
  });

  test('should handle bulk audit log queries correctly', async () => {
    await dbManager.connect();
    const auditMap = await dbManager.getBotConfigurationAuditBulk([1, 2, 3, 4, 5]);

    expect(auditMap).toBeInstanceOf(Map);
    expect(auditMap.size).toBe(5);
    expect(auditMap.get(1)!.length).toBe(3);
  });
});
