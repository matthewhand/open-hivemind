import { DatabaseManager } from '../../src/database/DatabaseManager';
import { DatabaseError } from '../../src/types/errorClasses';
// Import the mock functions from the sqlite mock module
// Jest config maps 'sqlite' to 'tests/mocks/sqlite.ts'
import sqliteMock from '../mocks/sqlite';

const { mockRun, mockGet, mockAll, mockExec, mockClose, mockDb } = sqliteMock;

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;
  const testConfig = {
    type: 'sqlite' as const,
    path: ':memory:',
  };

  beforeEach(() => {
    // Clear all mock call history
    mockRun.mockClear();
    mockGet.mockClear();
    mockAll.mockClear();
    mockExec.mockClear();
    mockClose.mockClear();

    // Reset mock implementations to defaults
    mockRun.mockResolvedValue({ lastID: 1, changes: 1 });
    mockGet.mockResolvedValue(undefined);
    mockAll.mockResolvedValue([]);
    mockExec.mockResolvedValue(undefined);
    mockClose.mockResolvedValue(undefined);

    // Reset singleton instance for each test
    // @ts-ignore - Accessing private property for testing
    DatabaseManager.instance = null;
    dbManager = DatabaseManager.getInstance(testConfig);
  });

  describe('Connection', () => {
    it('should connect successfully', async () => {
      await dbManager.connect();
      expect(dbManager.isConnected()).toBe(true);
      expect(mockExec).toHaveBeenCalled(); // Should create tables
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      const open = require('sqlite').open;
      open.mockRejectedValueOnce(error);

      // @ts-ignore - Accessing private property for testing
      DatabaseManager.instance = null;
      dbManager = DatabaseManager.getInstance(testConfig);

      await expect(dbManager.connect()).rejects.toThrow(DatabaseError);
      expect(dbManager.isConnected()).toBe(false);
    });

    it('should disconnect successfully', async () => {
      await dbManager.connect();
      await dbManager.disconnect();
      expect(mockClose).toHaveBeenCalled();
      expect(dbManager.isConnected()).toBe(false);
    });
  });

  describe('Message Operations', () => {
    beforeEach(async () => {
      await dbManager.connect();
    });

    it('should save a message', async () => {
      mockRun.mockResolvedValueOnce({ lastID: 1 });

      const messageId = await dbManager.saveMessage(
        'channel-1',
        'user-1',
        'Hello World',
        'discord'
      );

      expect(messageId).toBe(1);
      expect(mockRun).toHaveBeenCalledWith(
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
      mockAll.mockResolvedValueOnce(mockMessages);

      const history = await dbManager.getMessageHistory('channel-1', 10);

      expect(history).toHaveLength(1);
      expect(history[0].content).toBe('Hello');
      expect(mockAll).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM messages'), [
        'channel-1',
        10,
      ]);
    });

    it('should handle errors when saving messages', async () => {
      mockRun.mockRejectedValueOnce(new Error('Insert failed'));

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
      mockRun.mockResolvedValueOnce({ lastID: 1 });

      const id = await dbManager.createBotConfiguration(mockConfig);

      expect(id).toBe(1);
      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO bot_configurations'),
        expect.any(Array)
      );
    });

    it('should retrieve bot configuration by id', async () => {
      mockGet.mockResolvedValueOnce({
        id: 1,
        ...mockConfig,
        createdAt: mockConfig.createdAt.toISOString(),
        updatedAt: mockConfig.updatedAt.toISOString(),
        isActive: 1,
      });

      const config = await dbManager.getBotConfiguration(1);

      expect(config).toBeDefined();
      expect(config?.name).toBe('TestBot');
    });

    it('should update bot configuration', async () => {
      mockRun.mockResolvedValueOnce({ changes: 1 });

      await dbManager.updateBotConfiguration(1, { name: 'UpdatedBot' });

      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE bot_configurations'),
        expect.arrayContaining(['UpdatedBot', 1])
      );
    });

    it('should delete bot configuration', async () => {
      mockRun.mockResolvedValueOnce({ changes: 1 });

      const result = await dbManager.deleteBotConfiguration(1);

      expect(result).toBe(true);
      expect(mockRun).toHaveBeenCalledWith(
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
      mockRun.mockResolvedValueOnce({ changes: 1 });

      await dbManager.storeAnomaly(mockAnomaly);

      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO anomalies'),
        expect.any(Array)
      );
    });

    it('should retrieve active anomalies', async () => {
      mockAll.mockResolvedValueOnce([
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
      mockRun.mockResolvedValueOnce({ changes: 1 });

      const result = await dbManager.resolveAnomaly('anomaly-1');

      expect(result).toBe(true);
      expect(mockRun).toHaveBeenCalledWith(
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

      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO bot_metrics'),
        expect.any(Array)
      );
    });

    it('should get bot metrics', async () => {
      mockAll.mockResolvedValueOnce([
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
});
