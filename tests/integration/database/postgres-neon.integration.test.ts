import 'reflect-metadata';
import { DatabaseManager } from '../../../src/database/DatabaseManager';
import * as crypto from 'crypto';
import dotenv from 'dotenv';

// Load .env to pick up DATABASE_URL
dotenv.config();

console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

describe('Postgres Real Integration (Neon.tech)', () => {
  const dbUrl = process.env.DATABASE_URL;
  
  // Only run if DATABASE_URL is present
  const describeIfUrl = dbUrl ? describe : describe.skip;

  describeIfUrl('Database Operations with Real Postgres', () => {
    let dbManager: DatabaseManager;
    const testBotName = `TestBot-${crypto.randomInt(10000, 99999)}`;
    const testChannelId = `test-channel-${crypto.randomUUID()}`;

    beforeAll(async () => {
      // Reset singleton
      (DatabaseManager as any).instance = undefined;
      
      dbManager = DatabaseManager.getInstance({
        type: 'postgres',
      });
      
      await dbManager.connect();
    });

    afterAll(async () => {
      // Cleanup test data if possible, or just disconnect
      if (dbManager && dbManager.isConnected()) {
        try {
          // We could delete test data here, but for now we just disconnect
          await dbManager.disconnect();
        } catch (e) {
          console.error('Error during disconnect:', e);
        }
      }
      (DatabaseManager as any).instance = undefined;
    });

    it('should be connected to a postgres database', () => {
      expect(dbManager.isConnected()).toBe(true);
      // @ts-ignore - access private config for verification
      expect(dbManager.config.type).toBe('postgres');
    });

    it('should perform message CRUD operations', async () => {
      const content = 'Hello Postgres integration test';
      const authorId = 'user-real-test';
      
      // 1. Save message
      const result = await dbManager.saveMessage(testChannelId, authorId, content, 'test-provider');
      expect(result).toBeDefined();

      // 2. Retrieve history
      const history = await dbManager.getMessageHistory(testChannelId, 5);
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe(content);
      expect(history[0].authorId).toBe(authorId);
    });

    it('should perform log persistence', async () => {
      const logMessage = `Integration test log ${crypto.randomUUID()}`;
      
      await dbManager.saveLog({
        level: 'info',
        message: logMessage,
        context: 'integration-test',
        metadata: { neon: true }
      });

      // Verify log exists - using raw query since we don't have getLogs method yet
      // @ts-ignore
      const db = dbManager.db;
      const rows = await db.all('SELECT * FROM logs WHERE message = ?', [logMessage]);
      
      expect(rows).toHaveLength(1);
      expect(rows[0].level).toBe('info');
    });

    it('should perform bot configuration operations', async () => {
      const config = {
        name: testBotName,
        messageProvider: 'slack',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 1. Create
      const id = await dbManager.createBotConfiguration(config);
      expect(id).toBeDefined();

      // 2. Retrieve
      const retrieved = await dbManager.getBotConfigurationByName(testBotName);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe(testBotName);
      expect(retrieved?.messageProvider).toBe('slack');

      // 3. Update
      await dbManager.updateBotConfiguration(retrieved!.id!, { persona: 'Updated Persona' });
      const updated = await dbManager.getBotConfigurationByName(testBotName);
      expect(updated?.persona).toBe('Updated Persona');

      // 4. Delete
      const deleted = await dbManager.deleteBotConfiguration(retrieved!.id!);
      expect(deleted).toBe(true);
      
      const gone = await dbManager.getBotConfigurationByName(testBotName);
      expect(gone).toBeNull();
    });

    it('should handle complex metadata in messages', async () => {
      const complexMetadata = {
        nested: { key: 'value' },
        tags: ['a', 'b'],
        count: 42
      };
      
      const messageId = await dbManager.storeMessage({
        messageId: `msg-${crypto.randomUUID()}`,
        channelId: testChannelId,
        content: 'Complex metadata test',
        authorId: 'user-complex',
        authorName: 'Complex User',
        timestamp: new Date(),
        provider: 'test',
        metadata: complexMetadata
      });

      expect(messageId).toBeDefined();
      
      const history = await dbManager.getMessageHistory(testChannelId, 10);
      const found = history.find(m => m.metadata && (m.metadata as any).count === 42);
      expect(found).toBeDefined();
      expect(found?.metadata).toEqual(complexMetadata);
    });
  });
});
