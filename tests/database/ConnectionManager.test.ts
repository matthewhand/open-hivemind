import { ConnectionManager } from '../../src/database/ConnectionManager';
import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';

// Mock sqlite and sqlite3
const mockRun = jest.fn();
const mockAll = jest.fn();
const mockClose = jest.fn();
const mockConfigure = jest.fn();

const mockDb = {
    run: mockRun,
    all: mockAll,
    close: mockClose,
    configure: mockConfigure
};

jest.mock('sqlite', () => ({
    open: jest.fn()
}));

jest.mock('sqlite3', () => ({
    Database: jest.fn()
}));

describe('ConnectionManager', () => {
    let connectionManager: ConnectionManager;
    const dbPath = ':memory:';

    beforeEach(() => {
        jest.clearAllMocks();
        connectionManager = new ConnectionManager({ databasePath: dbPath });
    });

    describe('Connection Handling', () => {
        it('should connect to the database', async () => {
            const emitSpy = jest.spyOn(connectionManager, 'emit');

            await connectionManager.connect();

            expect(require('sqlite').open).toHaveBeenCalledWith({
                filename: dbPath,
                driver: sqlite3.Database
            });
            expect(connectionManager.isConnectedToDatabase()).toBe(true);
            expect(emitSpy).toHaveBeenCalledWith('connected');
        });

        it('should not reconnect if already connected', async () => {
            await connectionManager.connect();
            require('sqlite').open.mockClear();

            await connectionManager.connect();

            expect(require('sqlite').open).not.toHaveBeenCalled();
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
            require('sqlite').open.mockRejectedValueOnce(error);
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