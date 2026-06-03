import databaseConfig from '../../src/config/databaseConfig';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { PostgresWrapper } from '../../src/database/postgresWrapper';
import { SQLiteWrapper } from '../../src/database/sqliteWrapper';
import { DatabaseError } from '../../src/types/errorClasses';

// Spies on the mocked Database
let runSpy: jest.SpyInstance;
let getSpy: jest.SpyInstance;
let allSpy: jest.SpyInstance;
let execSpy: jest.SpyInstance;
let closeSpy: jest.SpyInstance;

jest.mock('../../src/database/postgresWrapper');

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;
  const testConfig = {
    type: 'sqlite' as const,
    path: ':memory:',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    runSpy = jest
      .spyOn(SQLiteWrapper.prototype, 'run')
      .mockResolvedValue({ lastID: 1, changes: 1 });
    getSpy = jest.spyOn(SQLiteWrapper.prototype, 'get').mockResolvedValue(undefined);
    allSpy = jest.spyOn(SQLiteWrapper.prototype, 'all').mockResolvedValue([]);
    execSpy = jest.spyOn(SQLiteWrapper.prototype, 'exec').mockResolvedValue(undefined);
    closeSpy = jest.spyOn(SQLiteWrapper.prototype, 'close').mockResolvedValue(undefined);

    // Mock databaseConfig
    jest.spyOn(databaseConfig, 'get').mockImplementation((key: string) => {
      if (key === 'DATABASE_TYPE') return 'sqlite';
      if (key === 'DATABASE_PATH') return ':memory:';
      return false;
    });

    // Reset singleton instance for each test
    // @ts-ignore - Accessing private property for testing
    DatabaseManager.instance = null;
    dbManager = DatabaseManager.getInstance(testConfig);
  });

  describe('Database Toggling', () => {
    it('should initialize with SQLite by default', () => {
      // @ts-ignore
      expect(dbManager.config.type).toBe('sqlite');
    });

    it('should initialize with Postgres when configured', () => {
      jest.spyOn(databaseConfig, 'get').mockImplementation((key: string) => {
        if (key === 'DATABASE_TYPE') return 'postgres';
        return '';
      });

      // @ts-ignore
      DatabaseManager.instance = null;
      const pgManager = DatabaseManager.getInstance();
      // @ts-ignore
      expect(pgManager.config.type).toBe('postgres');
    });

    it('should use DATABASE_URL if provided for Postgres', async () => {
      const url = 'postgres://user:pass@host:5432/db';
      process.env.DATABASE_URL = url;

      jest.spyOn(databaseConfig, 'get').mockImplementation((key: string) => {
        if (key === 'DATABASE_TYPE') return 'postgres';
        if (key === 'DATABASE_URL') return url;
        return '';
      });

      // @ts-ignore
      DatabaseManager.instance = null;
      const pgManager = DatabaseManager.getInstance();
      await pgManager.connect();

      expect(PostgresWrapper).toHaveBeenCalledWith(url);
      delete process.env.DATABASE_URL;
    });
  });

  describe('Connection', () => {
    it('should connect successfully', async () => {
      await dbManager.connect();
      expect(dbManager.isConnected()).toBe(true);
      expect(execSpy).toHaveBeenCalled(); // Should create tables
    });

    it('should disconnect successfully', async () => {
      await dbManager.connect();
      await dbManager.disconnect();
      expect(closeSpy).toHaveBeenCalled();
      expect(dbManager.isConnected()).toBe(false);
    });
  });

  describe('Logging Persistence', () => {
    beforeEach(async () => {
      await dbManager.connect();
    });

    it('should save a log entry', async () => {
      await dbManager.saveLog({
        level: 'info',
        message: 'Test log',
        context: 'test',
        details: { foo: 'bar' },
      });

      expect(runSpy).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO logs'),
        expect.arrayContaining(['info', 'test', 'Test log', JSON.stringify({ foo: 'bar' })])
      );
    });
  });

  describe('Message Operations', () => {
    beforeEach(async () => {
      await dbManager.connect();
    });

    it('should save a message', async () => {
      runSpy.mockResolvedValueOnce({ lastID: 1 });

      const messageId = await dbManager.saveMessage(
        'channel-1',
        'user-1',
        'Hello World',
        'discord'
      );

      expect(messageId).toBe(1);
      expect(runSpy).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO messages'),
        expect.arrayContaining(['channel-1', 'user-1', 'Hello World', 'discord'])
      );
    });

    it('should retrieve message history', async () => {
      const mockMessages = [
        {
          id: 1,
          messageId: 'msg-1',
          channelId: 'channel-1',
          content: 'Hello',
          authorId: 'user-1',
          authorName: 'User 1',
          timestamp: new Date().toISOString(),
          provider: 'discord',
        },
      ];
      allSpy.mockResolvedValueOnce(mockMessages);

      const history = await dbManager.getMessageHistory('channel-1', 10);

      expect(history).toHaveLength(1);
      expect(history[0].content).toBe('Hello');
      expect(allSpy).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM messages'), [
        'channel-1',
        10,
      ]);
    });

    it('should handle errors when saving messages', async () => {
      runSpy.mockRejectedValueOnce(new Error('Insert failed'));

      const messageId = await dbManager.saveMessage('channel-1', 'user-1', 'Hello', 'discord');

      // Should return a fallback ID on error
      expect(typeof messageId).toBe('number');
    });
  });

  describe('Bot Configuration', () => {
    beforeEach(async () => {
      await dbManager.connect();
    });

    const mockConfig = {
      name: 'TestBot',
      messageProvider: 'discord',
      llmProvider: 'openai',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create bot configuration', async () => {
      runSpy.mockResolvedValueOnce({ lastID: 1 });

      const id = await dbManager.createBotConfiguration(mockConfig);

      expect(id).toBe(1);
      expect(runSpy).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO bot_configurations'),
        expect.any(Array)
      );
    });

    it('should retrieve bot configuration by id', async () => {
      getSpy.mockResolvedValueOnce({
        id: 1,
        ...mockConfig,
        createdAt: mockConfig.createdAt.toISOString(),
        updatedAt: mockConfig.updatedAt.toISOString(),
        isActive: 1,
      });

      const config = await dbManager.getBotConfiguration(1);

      expect(config).not.toBeNull();
      expect(config?.name).toBe('TestBot');
    });

    it('should update bot configuration', async () => {
      runSpy.mockResolvedValueOnce({ changes: 1 });

      await dbManager.updateBotConfiguration(1, { name: 'UpdatedBot' });

      expect(runSpy).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE bot_configurations'),
        expect.arrayContaining(['UpdatedBot', 1])
      );
    });

    it('should delete bot configuration', async () => {
      runSpy.mockResolvedValueOnce({ changes: 1 });

      const result = await dbManager.deleteBotConfiguration(1);

      expect(result).toBe(true);
      expect(runSpy).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM bot_configurations'),
        [1]
      );
    });
  });

  describe('Anomaly Detection', () => {
    beforeEach(async () => {
      await dbManager.connect();
    });

    const mockAnomaly = {
      id: 'anomaly-1',
      timestamp: new Date(),
      metric: 'response_time',
      value: 1000,
      expectedMean: 500,
      standardDeviation: 100,
      zScore: 5,
      threshold: 3,
      severity: 'high' as const,
      explanation: 'High latency',
      resolved: false,
    };

    it('should store anomaly', async () => {
      runSpy.mockResolvedValueOnce({ changes: 1 });

      await dbManager.storeAnomaly(mockAnomaly);

      expect(runSpy).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO anomalies'),
        expect.any(Array)
      );
    });

    it('should retrieve active anomalies', async () => {
      allSpy.mockResolvedValueOnce([
        {
          ...mockAnomaly,
          timestamp: mockAnomaly.timestamp.toISOString(),
          resolved: 0,
        },
      ]);

      const anomalies = await dbManager.getActiveAnomalies();

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].id).toBe('anomaly-1');
      expect(anomalies[0].resolved).toBe(false);
    });

    it('should resolve anomaly', async () => {
      runSpy.mockResolvedValueOnce({ changes: 1 });

      const result = await dbManager.resolveAnomaly('anomaly-1');

      expect(result).toBe(true);
      expect(runSpy).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE anomalies SET resolved = 1'),
        ['anomaly-1']
      );
    });
  });

  describe('Metrics', () => {
    beforeEach(async () => {
      await dbManager.connect();
    });

    it('should update bot metrics', async () => {
      const metrics = {
        botName: 'TestBot',
        messagesSent: 10,
        messagesReceived: 20,
        conversationsHandled: 5,
        averageResponseTime: 150,
        lastActivity: new Date(),
        provider: 'discord',
      };

      await dbManager.updateBotMetrics(metrics);

      expect(runSpy).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO bot_metrics'),
        expect.any(Array)
      );
    });

    it('should throw RangeError for negative or NaN metrics', async () => {
      const invalidMetrics = {
        botName: 'TestBot',
        messagesSent: -10, // Invalid
        messagesReceived: 20,
        conversationsHandled: 5,
        averageResponseTime: 150,
        lastActivity: new Date(),
        provider: 'discord',
      };

      await expect(dbManager.updateBotMetrics(invalidMetrics)).rejects.toThrow(RangeError);

      const nanMetrics = {
        ...invalidMetrics,
        messagesSent: 10,
        averageResponseTime: NaN, // Invalid
      };

      await expect(dbManager.updateBotMetrics(nanMetrics)).rejects.toThrow(RangeError);
    });

    it('should get bot metrics', async () => {
      allSpy.mockResolvedValueOnce([
        {
          botName: 'TestBot',
          messagesSent: 10,
          lastActivity: new Date().toISOString(),
        },
      ]);

      const metrics = await dbManager.getBotMetrics('TestBot');

      expect(metrics).toHaveLength(1);
      expect(metrics[0].botName).toBe('TestBot');
    });
  });

  describe('AI Feedback', () => {
    beforeEach(async () => {
      await dbManager.connect();
    });

    it('should store AI feedback', async () => {
      runSpy.mockResolvedValueOnce({ lastID: 1 });

      const feedback = {
        recommendationId: 'rec-1',
        feedback: 'liked',
        metadata: { userId: 'user-1' },
      };

      const id = await dbManager.storeAIFeedback(feedback);

      expect(id).toBe(1);
      expect(runSpy).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ai_feedback'),
        expect.arrayContaining(['rec-1', 'liked', JSON.stringify({ userId: 'user-1' })])
      );
    });

    it('should handle errors when storing AI feedback', async () => {
      runSpy.mockRejectedValueOnce(new Error('Insert failed'));

      const feedback = {
        recommendationId: 'rec-1',
        feedback: 'liked',
      };

      await expect(dbManager.storeAIFeedback(feedback)).rejects.toThrow(
        'Failed to store AI feedback'
      );
    });

    it('should clear AI feedback', async () => {
      runSpy.mockResolvedValueOnce({ changes: 5 });

      const deletedCount = await dbManager.clearAIFeedback();

      expect(deletedCount).toBe(5);
      expect(runSpy).toHaveBeenCalledWith('DELETE FROM ai_feedback');
    });
  });
});
