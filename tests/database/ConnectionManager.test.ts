import { ConnectionManager } from '../../src/database/ConnectionManager';
import Database from 'better-sqlite3';

jest.mock('../../src/common/logger');

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;
  const dbPath = ':memory:';

  // Spies on the mocked Database
  let runSpy: jest.SpyInstance;
  let allSpy: jest.SpyInstance;
  let closeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // @ts-ignore - Database is mocked and has these methods on prototype
    runSpy = jest.spyOn(Database.prototype, 'prepare');
    // @ts-ignore
    allSpy = jest.spyOn(Database.prototype, 'prepare');
    // @ts-ignore
    closeSpy = jest.spyOn(Database.prototype, 'close');

    connectionManager = new ConnectionManager({ databasePath: dbPath });
  });

  afterEach(async () => {
    await connectionManager.disconnect();
  });

  describe('Connection Handling', () => {
    it('should connect to the database', async () => {
      await connectionManager.connect();
      expect(connectionManager.isConnectedToDatabase()).toBe(true);
    });

    it('should not reconnect if already connected', async () => {
      await connectionManager.connect();
      const dbBefore = (connectionManager as any).db;
      await connectionManager.connect();
      expect((connectionManager as any).db).toBe(dbBefore);
    });

    it.skip('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      // Mocking the constructor to throw
      const DatabaseMock = Database as jest.MockedClass<any>;
      DatabaseMock.mockImplementationOnce(() => {
        throw error;
      });

      const emitSpy = jest.spyOn(connectionManager, 'emit');
      await expect(connectionManager.connect()).rejects.toThrow('Connection failed');
      expect(connectionManager.isConnectedToDatabase()).toBe(false);
    });
  });

  describe('Query Execution', () => {
    beforeEach(async () => {
      await connectionManager.connect();
    });

    it('should execute a query', async () => {
      const result = await connectionManager.executeQuery('INSERT INTO test VALUES (1)');
      expect(result).toBeDefined();
    });

    it('should throw if not connected', async () => {
      await connectionManager.disconnect();
      await expect(connectionManager.executeQuery('SELECT 1')).rejects.toThrow('Database not connected');
    });
  });
});
