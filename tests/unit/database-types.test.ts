/**
 * Unit tests for database type safety improvements
 */

import 'reflect-metadata';

describe('Database Type Safety', () => {
  let DatabaseManager: any;
  let dbManager: any;

  beforeEach(() => {
    jest.resetModules();
    
    // Mock SQLiteWrapper specifically for this test to store state in a Map
    const dbState = new Map<number, any>();
    let idCounter = 0;

    jest.doMock('../../src/database/sqliteWrapper', () => ({
      SQLiteWrapper: class {
        async run(sql: string, params: any[]) {
          if (sql.includes('INSERT INTO bot_configurations')) {
            idCounter++;
            // Very simplified: just store the name from params if possible
            const name = params && params.length > 0 ? params[0] : 'Unknown';
            dbState.set(idCounter, { id: idCounter, name, discord: { channelId: 'typed-channel' }, mcpGuard: { enabled: true } });
            return { lastID: idCounter, lastInsertRowid: idCounter, changes: 1 };
          }
          return { lastID: 1, changes: 1 };
        }
        async get(_sql: string, params: any[]) {
          const id = params && params.length > 0 ? params[0] : 0;
          return dbState.get(id);
        }
        async all() { return []; }
        async exec() { return Promise.resolve(); }
        async configure() { return Promise.resolve(); }
        async close() { return Promise.resolve(); }
        isConnected() { return true; }
      }
    }));

    const dmModule = require('../../src/database/DatabaseManager');
    DatabaseManager = dmModule.DatabaseManager;
    DatabaseManager.instance = null;
    dbManager = DatabaseManager.getInstance({ type: 'sqlite', path: ':memory:' });
  });

  describe('Database Manager Integration', () => {
    test('should work with typed configurations', async () => {
      await dbManager.connect();

      const typedConfig: any = {
        name: 'Typed Test Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: {
          channelId: 'typed-channel',
          token: 'typed-token',
        },
        mcpGuard: {
          enabled: true,
          type: 'owner',
        },
        isActive: true,
      };

      const configId = await dbManager.createBotConfiguration(typedConfig);
      expect(typeof configId).toBe('number');
      expect(configId).toBeGreaterThan(0);

      const retrievedConfig = await dbManager.getBotConfiguration(configId);
      expect(retrievedConfig).not.toBeNull();
      expect(retrievedConfig!.name).toBe('Typed Test Bot');
      expect(retrievedConfig!.discord?.channelId).toBe('typed-channel');
      expect(retrievedConfig!.mcpGuard?.enabled).toBe(true);

      await dbManager.disconnect();
    });
  });
});
