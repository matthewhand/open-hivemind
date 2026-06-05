import Database from 'better-sqlite3';
import { ConnectionManager } from '../../src/database/ConnectionManager';

jest.mock('../../src/common/logger');

// better-sqlite3 is mapped to tests/mocks/sqlite3.ts by moduleNameMapper.
// Wrap it in a jest.fn() constructor so tests can use mockImplementationOnce
// to simulate constructor errors while all other tests get a working mock.
jest.mock('better-sqlite3', () => {
  const actual = jest.requireActual('better-sqlite3');
  const ctor = jest.fn().mockImplementation((...args: any[]) => new actual(...args));
  // Preserve static properties (verbose, etc.) from the original mock.
  Object.assign(ctor, actual);
  return ctor;
});

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;
  const dbPath = ':memory:';

  beforeEach(() => {
    jest.clearAllMocks();

    // Restore the default (working) implementation so that mockImplementationOnce
    // in the error-path test does not bleed into subsequent tests.
    (Database as jest.MockedFunction<any>).mockImplementation((...args: any[]) => {
      return new (jest.requireActual('better-sqlite3'))(...args);
    });

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

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      (Database as jest.MockedFunction<any>).mockImplementationOnce(() => {
        throw error;
      });

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
      await expect(connectionManager.executeQuery('SELECT 1')).rejects.toThrow(
        'Database not connected'
      );
    });
  });
});
