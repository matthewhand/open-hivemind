import 'reflect-metadata';
import databaseConfig from '../../../src/config/databaseConfig';
import { DatabaseManager } from '../../../src/database/DatabaseManager';

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

  const setupDb = async () => {
    dbManager = DatabaseManager.getInstance({
      type: 'postgres',
      url: process.env.DATABASE_URL,
    } as any);

    // Override the config for this test to have small retention
    jest.spyOn(databaseConfig, 'get').mockImplementation((key: string) => {
      if (key === 'AUTO_RETENTION') return false;
      if (key === 'AUTO_CLEANUP_ON_STARTUP') return false;
      if (key === 'MAX_HISTORY_ROWS') return 5;
      if (key === 'LOG_RETENTION_DAYS') return 1;
      if (key === 'DATABASE_TYPE') return 'postgres';
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

    for (let i = 0; i < count; i++) {
      await db.run(
        `INSERT INTO messages (messageId, channelId, content, authorId, authorName, provider, timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${daysOld} days')`,
        [`msg-${i}-${daysOld}`, 'ch1', `Test message ${i}`, 'user1', 'User 1', 'test']
      );
    }
  };

  const getMessageCount = async () => {
    // @ts-ignore
    const db = dbManager.db;
    const rows = await db.all('SELECT id FROM messages');
    return rows.length;
  };

  it('should cleanup Postgres database by rows', async () => {
    if (!process.env.DATABASE_URL) {
      console.warn('Skipping Postgres cleanup test: DATABASE_URL not set');
      return;
    }
    await setupDb();
    await insertMessages(10);

    expect(await getMessageCount()).toBe(10);

    await dbManager.runFullCleanup();

    expect(await getMessageCount()).toBe(5);
  });

  it('should cleanup Postgres database by date', async () => {
    if (!process.env.DATABASE_URL) {
      return;
    }
    await setupDb();
    await insertMessages(3, 0);
    await insertMessages(4, 2);

    expect(await getMessageCount()).toBe(7);

    await dbManager.runFullCleanup();

    expect(await getMessageCount()).toBe(3);
  });
});
