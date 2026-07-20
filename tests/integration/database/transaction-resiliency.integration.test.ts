import 'reflect-metadata';
import * as crypto from 'crypto';
import dotenv from 'dotenv';
import { DatabaseManager } from '../../../src/database/DatabaseManager';
import { PostgresWrapper } from '../../../src/database/postgresWrapper';
import { SQLiteWrapper } from '../../../src/database/sqliteWrapper';

jest.unmock('better-sqlite3');
jest.unmock('pg');

dotenv.config();

describe('Database Transaction Resiliency', () => {
  const testBotName = `ResiliencyBot-${crypto.randomUUID()}`;

  // Postgres test requires a live, reachable DATABASE_URL AND an explicit
  // ALLOW_REAL_SECRETS=true opt-in (matching the jest.setup.ts Proxy gate and
  // the project's `test:real` convention). Otherwise skip so the suite reports
  // as skipped rather than failing in DB-less / CI environments.
  const realDbConfigured =
    !!process.env.DATABASE_URL &&
    !/^(your-|your_|<.+>|CHANGE.?ME|xxx|test-token|placeholder)/i.test(process.env.DATABASE_URL) &&
    process.env.ALLOW_REAL_SECRETS === 'true';
  const describePostgres = realDbConfigured ? describe : describe.skip;

  it('should roll back partial data on SQLite (Direct Wrapper)', async () => {
    const db = new SQLiteWrapper(':memory:');

    // Setup: Create table
    await db.exec(
      'CREATE TABLE bot_configurations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, messageProvider TEXT, llmProvider TEXT, isActive INTEGER)'
    );

    try {
      await db.transaction(async (tx: any) => {
        await tx.run(
          'INSERT INTO bot_configurations (name, messageProvider, llmProvider, isActive) VALUES (?, ?, ?, ?)',
          [testBotName, 'discord', 'openai', 1]
        );

        const insideResult = await tx.get('SELECT name FROM bot_configurations WHERE name = ?', [
          testBotName,
        ]);
        expect(insideResult?.name).toBe(testBotName);

        throw new Error('SIMULATED_FAILURE');
      });
    } catch (err: any) {
      if (err.message !== 'SIMULATED_FAILURE') throw err;
    }

    const finalResult = await db.get('SELECT name FROM bot_configurations WHERE name = ?', [
      testBotName,
    ]);
    expect(finalResult).toBeUndefined();
    await db.close();
  });

  describePostgres('Neon Postgres (Direct Wrapper)', () => {
    it('should roll back partial data on Neon Postgres', async () => {
      const db = new PostgresWrapper(process.env.DATABASE_URL as string);
      // Setup: Ensure table exists
      await db.exec(
        'CREATE TABLE IF NOT EXISTS bot_configurations (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, messageProvider TEXT NOT NULL, llmProvider TEXT NOT NULL, isActive INTEGER)'
      );

      try {
        await db.transaction(async (tx: any) => {
          await tx.run(
            'INSERT INTO bot_configurations (name, messageProvider, llmProvider, isActive) VALUES (?, ?, ?, ?)',
            [testBotName, 'discord', 'openai', 1]
          );

          const insideResult = await tx.get('SELECT name FROM bot_configurations WHERE name = ?', [
            testBotName,
          ]);
          expect(insideResult?.name).toBe(testBotName);

          throw new Error('SIMULATED_FAILURE');
        });
      } catch (err: any) {
        if (err.message !== 'SIMULATED_FAILURE') throw err;
      }

      const finalResult = await db.get('SELECT name FROM bot_configurations WHERE name = ?', [
        testBotName,
      ]);
      expect(finalResult).toBeUndefined();

      // Cleanup if it somehow leaked
      await db.run('DELETE FROM bot_configurations WHERE name = ?', [testBotName]);
      await db.close();
    });
  });
});
