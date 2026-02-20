import { ConnectionManager } from '../../src/database/ConnectionManager';
// Import the mock functions from the sqlite mock module  
// Jest config maps 'sqlite' to 'tests/mocks/sqlite.ts'
import sqliteMock from '../mocks/sqlite';
// Import sqlite3 mock (Jest config maps 'sqlite3' to 'tests/mocks/sqlite3.ts')
import sqlite3 from '../mocks/sqlite3';

const { mockRun, mockAll, mockClose, mockConfigure, mockDb, open: mockOpen } = sqliteMock;

describe('ConnectionManager', () => {
    let connectionManager: ConnectionManager;
    const dbPath = ':memory:';

    beforeEach(() => {
        // Clear all mock call history
        mockRun.mockClear();
        mockAll.mockClear();
        mockClose.mockClear();
        mockOpen.mockClear();
        mockConfigure.mockClear();

        // Reset mock implementations
        mockRun.mockResolvedValue({ lastID: 1, changes: 1 });
        mockAll.mockResolvedValue([]);
        mockClose.mockResolvedValue(undefined);
        mockOpen.mockResolvedValue(mockDb);

        connectionManager = new ConnectionManager({ databasePath: dbPath });
    });

    describe('Connection Handling', () => {
        it('should connect to the database', async () => {
            const emitSpy = jest.spyOn(connectionManager, 'emit');

            await connectionManager.connect();

            expect(mockOpen).toHaveBeenCalledWith(expect.objectContaining({
                filename: dbPath
            }));
            expect(connectionManager.isConnectedToDatabase()).toBe(true);
            expect(emitSpy).toHaveBeenCalledWith('connected');
        });

        it('should not reconnect if already connected', async () => {
            await connectionManager.connect();
            mockOpen.mockClear();

            await connectionManager.connect();

            expect(mockOpen).not.toHaveBeenCalled();
        });

        it('should configure timeout if provided', async () => {
            connectionManager = new ConnectionManager({
                databasePath: dbPath,
                timeout: 5000
            });

            await connectionManager.connect();

            expect(mockConfigure).toHaveBeenCalledWith('busyTimeout', 5000);
        });

        it('should handle connection errors', async () => {
            const error = new Error('Connection failed');
            mockOpen.mockRejectedValueOnce(error);
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

            expect(mockClose).toHaveBeenCalled();
            expect(connectionManager.isConnectedToDatabase()).toBe(false);
            expect(emitSpy).toHaveBeenCalledWith('disconnected');
        });

        it('should do nothing if already disconnected', async () => {
            await connectionManager.disconnect();
            expect(mockClose).not.toHaveBeenCalled();
        });

        it('should handle disconnection errors', async () => {
            await connectionManager.connect();
            const error = new Error('Close failed');
            mockClose.mockRejectedValueOnce(error);
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
            mockRun.mockImplementation((query, callback) => {
                callback.call({ lastID: 1, changes: 1 }, null);
            });

            const result = await connectionManager.executeQuery('INSERT INTO test VALUES (1)');

            expect(mockRun).toHaveBeenCalledWith('INSERT INTO test VALUES (1)', expect.any(Function));
            expect(result).toEqual({ lastID: 1, changes: 1 });
        });

        it('should execute a query with params', async () => {
            mockRun.mockImplementation((query, params, callback) => {
                callback.call({ lastID: 1, changes: 1 }, null);
            });

            const result = await connectionManager.executeQuery('INSERT INTO test VALUES (?)', [1]);

            expect(mockRun).toHaveBeenCalledWith('INSERT INTO test VALUES (?)', [1], expect.any(Function));
            expect(result).toEqual({ lastID: 1, changes: 1 });
        });

        it('should handle query execution errors', async () => {
            const error = new Error('Query failed');
            mockRun.mockImplementation((query, callback) => {
                callback(error);
            });

            await expect(connectionManager.executeQuery('BAD QUERY')).rejects.toThrow('Query failed');
        });

        it('should throw if not connected', async () => {
            await connectionManager.disconnect();
            await expect(connectionManager.executeQuery('SELECT 1')).rejects.toThrow('Database not connected');
        });
    });

    describe('Select Queries', () => {
        beforeEach(async () => {
            await connectionManager.connect();
        });

        it('should execute a select query without params', async () => {
            const mockRows = [{ id: 1 }];
            mockAll.mockImplementation((query, callback) => {
                callback(null, mockRows);
            });

            const rows = await connectionManager.selectQuery('SELECT * FROM test');

            expect(mockAll).toHaveBeenCalledWith('SELECT * FROM test', expect.any(Function));
            expect(rows).toEqual(mockRows);
        });

        it('should execute a select query with params', async () => {
            const mockRows = [{ id: 1 }];
            mockAll.mockImplementation((query, params, callback) => {
                callback(null, mockRows);
            });

            const rows = await connectionManager.selectQuery('SELECT * FROM test WHERE id = ?', [1]);

            expect(mockAll).toHaveBeenCalledWith('SELECT * FROM test WHERE id = ?', [1], expect.any(Function));
            expect(rows).toEqual(mockRows);
        });

        it('should handle select query errors', async () => {
            const error = new Error('Select failed');
            mockAll.mockImplementation((query, callback) => {
                callback(error);
            });

            await expect(connectionManager.selectQuery('BAD QUERY')).rejects.toThrow('Select failed');
        });

        it('should throw if not connected', async () => {
            await connectionManager.disconnect();
            await expect(connectionManager.selectQuery('SELECT 1')).rejects.toThrow('Database not connected');
        });
    });
});