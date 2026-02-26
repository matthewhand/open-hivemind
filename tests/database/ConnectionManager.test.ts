import type { ConnectionManager as ConnectionManagerType } from '../../src/database/ConnectionManager';

describe('ConnectionManager', () => {
  let ConnectionManager: new (opts: any) => ConnectionManagerType;
  let connectionManager: ConnectionManagerType;
  const dbPath = ':memory:';

  // Spies
  let openSpy: jest.Mock;
  let runSpy: jest.SpyInstance;
  let allSpy: jest.SpyInstance;
  let closeSpy: jest.SpyInstance;
  let configureSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();

    // Get the real mock implementation
    const originalSqlite = jest.requireActual('../mocks/sqlite');

    // Create spy for open
    openSpy = jest.fn().mockImplementation(originalSqlite.open);

    // Mock the 'sqlite' module
    jest.doMock('sqlite', () => ({
      __esModule: true,
      ...originalSqlite,
      open: openSpy,
      default: {
        ...originalSqlite.default,
        open: openSpy,
      },
    }));

    // Spy on Database prototype methods
    // Note: We adhere to the class definition in the original mock
    runSpy = jest.spyOn(originalSqlite.Database.prototype, 'run');
    allSpy = jest.spyOn(originalSqlite.Database.prototype, 'all');
    closeSpy = jest.spyOn(originalSqlite.Database.prototype, 'close');
    configureSpy = jest.spyOn(originalSqlite.Database.prototype, 'configure');

    // Re-import ConnectionManager so it picks up the mocked 'sqlite'
    const module = require('../../src/database/ConnectionManager');
    ConnectionManager = module.ConnectionManager;

    connectionManager = new ConnectionManager({ databasePath: dbPath });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Connection Handling', () => {
    it('should connect to the database', async () => {
      const emitSpy = jest.spyOn(connectionManager, 'emit');

      await connectionManager.connect();

      expect(openSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: dbPath,
        })
      );
      expect(connectionManager.isConnectedToDatabase()).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith('connected');
    });

    it('should not reconnect if already connected', async () => {
      await connectionManager.connect();
      openSpy.mockClear();

      await connectionManager.connect();

      expect(openSpy).not.toHaveBeenCalled();
    });

    it('should configure timeout if provided', async () => {
      connectionManager = new ConnectionManager({
        databasePath: dbPath,
        timeout: 5000,
      });

      await connectionManager.connect();

      expect(configureSpy).toHaveBeenCalledWith('busyTimeout', 5000);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      openSpy.mockRejectedValueOnce(error);
      const emitSpy = jest.spyOn(connectionManager, 'emit');

      await expect(connectionManager.connect()).rejects.toThrow('Connection failed');
      expect(connectionManager.isConnectedToDatabase()).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith('connectionError', error);
    });
  });

  describe('Disconnection Handling', () => {
    it('should disconnect from the database', async () => {
      await connectionManager.connect();
      const emitSpy = jest.spyOn(connectionManager, 'emit');

      await connectionManager.disconnect();

      expect(closeSpy).toHaveBeenCalled();
      expect(connectionManager.isConnectedToDatabase()).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith('disconnected');
    });

    it('should do nothing if already disconnected', async () => {
      await connectionManager.disconnect();
      expect(closeSpy).not.toHaveBeenCalled();
    });

    it('should handle disconnection errors', async () => {
      await connectionManager.connect();
      const error = new Error('Close failed');
      closeSpy.mockRejectedValueOnce(error);
      const emitSpy = jest.spyOn(connectionManager, 'emit');

      await expect(connectionManager.disconnect()).rejects.toThrow('Close failed');
      expect(emitSpy).toHaveBeenCalledWith('closeError', error);
    });
  });

  describe('Query Execution', () => {
    beforeEach(async () => {
      await connectionManager.connect();
    });

    it('should execute a query without params', async () => {
      runSpy.mockImplementation((query, ...args) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          callback.call({ lastID: 1, changes: 1 }, null);
        }
        return Promise.resolve({ lastID: 1, changes: 1 });
      });

      const result = await connectionManager.executeQuery('INSERT INTO test VALUES (1)');

      expect(runSpy).toHaveBeenCalledWith('INSERT INTO test VALUES (1)', expect.any(Function));
      expect(result).toEqual({ lastID: 1, changes: 1 });
    });

    it('should execute a query with params', async () => {
      runSpy.mockImplementation((query, ...args) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          callback.call({ lastID: 1, changes: 1 }, null);
        }
        return Promise.resolve({ lastID: 1, changes: 1 });
      });

      const result = await connectionManager.executeQuery('INSERT INTO test VALUES (?)', [1]);

      expect(runSpy).toHaveBeenCalledWith('INSERT INTO test VALUES (?)', [1], expect.any(Function));
      expect(result).toEqual({ lastID: 1, changes: 1 });
    });

    it('should handle query execution errors', async () => {
      const error = new Error('Query failed');
      runSpy.mockImplementation((query, ...args) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          callback(error);
        }
        return Promise.resolve({} as any);
      });

      await expect(connectionManager.executeQuery('BAD QUERY')).rejects.toThrow('Query failed');
    });

    it('should throw if not connected', async () => {
      await connectionManager.disconnect();
      await expect(connectionManager.executeQuery('SELECT 1')).rejects.toThrow(
        'Database not connected'
      );
    });
  });

  describe('Select Queries', () => {
    beforeEach(async () => {
      await connectionManager.connect();
    });

    it('should execute a select query without params', async () => {
      const mockRows = [{ id: 1 }];
      allSpy.mockImplementation((query, ...args) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          callback(null, mockRows);
        }
        return Promise.resolve(mockRows);
      });

      const rows = await connectionManager.selectQuery('SELECT * FROM test');

      expect(allSpy).toHaveBeenCalledWith('SELECT * FROM test', expect.any(Function));
      expect(rows).toEqual(mockRows);
    });

    it('should execute a select query with params', async () => {
      const mockRows = [{ id: 1 }];
      allSpy.mockImplementation((query, ...args) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          callback(null, mockRows);
        }
        return Promise.resolve(mockRows);
      });

      const rows = await connectionManager.selectQuery('SELECT * FROM test WHERE id = ?', [1]);

      expect(allSpy).toHaveBeenCalledWith(
        'SELECT * FROM test WHERE id = ?',
        [1],
        expect.any(Function)
      );
      expect(rows).toEqual(mockRows);
    });

    it('should handle select query errors', async () => {
      const error = new Error('Select failed');
      allSpy.mockImplementation((query, ...args) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          callback(error);
        }
        return Promise.resolve([] as any);
      });

      await expect(connectionManager.selectQuery('BAD QUERY')).rejects.toThrow('Select failed');
    });

    it('should throw if not connected', async () => {
      await connectionManager.disconnect();
      await expect(connectionManager.selectQuery('SELECT 1')).rejects.toThrow(
        'Database not connected'
      );
    });
  });
});
