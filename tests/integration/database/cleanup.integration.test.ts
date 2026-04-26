import 'reflect-metadata';
jest.unmock('better-sqlite3');

import { DatabaseManager } from '../../../src/database/DatabaseManager';
import databaseConfig from '../../../src/config/databaseConfig';

describe('Database Cleanup Integration', () => {
  let dbManager: DatabaseManager;

  beforeEach(() => {
    jest.clearAllMocks();
    (DatabaseManager as any).instance = undefined;
  });

  afterEach(async () => {
    if (dbManager && dbManager.isConnected()) {
      await dbManager.disconnect();
    }
  });

  const setupDb = async (type: 'sqlite' | 'postgres', path?: string) => {
    dbManager = DatabaseManager.getInstance({ type, path, ...((type === 'postgres' && process.env.DATABASE_URL) ? { url: process.env.DATABASE_URL } : {}) } as any);
    
    // Override the config for this test to have small retention
    jest.spyOn(databaseConfig, 'get').mockImplementation((key: string) => {
      if (key === 'AUTO_RETENTION') return false;
      if (key === 'AUTO_CLEANUP_ON_STARTUP') return false;
      if (key === 'MAX_HISTORY_ROWS') return 5;
      if (key === 'LOG_RETENTION_DAYS') return 1;
      if (key === 'DATABASE_TYPE') return type;
      if (key === 'DATABASE_PATH') return path || '';
      return undefined;
    });

    await dbManager.connect();
    
    // For test cleanliness, wipe the messages table first
    // @ts-ignore
    await dbManager.db.run('DELETE FROM messages');
  };

  const insertMessages = async (count: number, daysOld = 0) => {
    // @ts-ignore
    const db = dbManager.db;
    const isPostgres = dbManager['config']?.type === 'postgres';
    
    for (let i = 0; i < count; i++) {
      if (isPostgres) {
        await db.run(
          `INSERT INTO messages (messageId, channelId, content, authorId, authorName, provider, timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${daysOld} days')`,
          [`msg-${i}`, 'ch1', `Test message ${i}`, 'user1', 'User 1', 'test']
        );
      } else {
        await db.run(
          `INSERT INTO messages (messageId, channelId, content, authorId, authorName, provider, timestamp) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-${daysOld} days'))`,
          [`msg-${i}`, 'ch1', `Test message ${i}`, 'user1', 'User 1', 'test']
        );
        const check = await db.all('SELECT * FROM messages');
        if (i === 0) console.log('Immediate check after insert:', check.length);
      }
    }
  };

  const getMessageCount = async () => {
    // @ts-ignore
    const db = dbManager.db;
    const rows = await db.all('SELECT * FROM messages');
    return rows.length;
  };

  it('should cleanup SQLite memory database by rows', async () => {
    await setupDb('sqlite', ':memory:');
    await insertMessages(10);
    
    expect(await getMessageCount()).toBe(10);
    
    await dbManager.runFullCleanup();
    
    expect(await getMessageCount()).toBe(5); // MAX_HISTORY_ROWS is mocked to 5
  });

  it('should cleanup SQLite memory database by date', async () => {
    await setupDb('sqlite', ':memory:');
    await insertMessages(3, 0); // 3 new messages
    await insertMessages(4, 2); // 4 old messages (2 days old)
    
    expect(await getMessageCount()).toBe(7);
    
    await dbManager.runFullCleanup();
    
    // Max rows is 5, but the 4 old logs will be deleted by date first, leaving 3.
    expect(await getMessageCount()).toBe(3);
  });

  it('should cleanup Postgres database by rows', async () => {
    if (!process.env.DATABASE_URL) {
      console.warn('Skipping Postgres cleanup test: DATABASE_URL not set');
      return;
    }
    await setupDb('postgres');
    await insertMessages(10);
    
    expect(await getMessageCount()).toBe(10);
    
    await dbManager.runFullCleanup();
    
    expect(await getMessageCount()).toBe(5);
  });

  it('should cleanup Postgres database by date', async () => {
    if (!process.env.DATABASE_URL) {
      return;
    }
    await setupDb('postgres');
    await insertMessages(3, 0); // 3 new messages
    await insertMessages(4, 2); // 4 old messages (2 days old)
    
    expect(await getMessageCount()).toBe(7);
    
    await dbManager.runFullCleanup();
    
    expect(await getMessageCount()).toBe(3);
  });
});
