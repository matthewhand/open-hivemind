import 'reflect-metadata';
import { ConnectionManager } from '../../src/database/ConnectionManager';
import { SchemaManager } from '../../src/database/SchemaManager';
import { SchemaRegistry } from '../../src/database/schemas';

jest.mock('../../src/common/logger');

/**
 * These tests exercise the alternate, modular schema-creation system
 * (SchemaManager + ConnectionManager + SchemaRegistry). This system is
 * intentionally NOT on the live DatabaseManager.connect()/runMigrations()
 * path — it is an on-demand, DI-resolvable alternative. The tests verify it is
 * wired correctly end-to-end: ConnectionManager exposes an IDatabase-compatible
 * view, and SchemaManager drives every registered schema module against it
 * without error.
 */
describe('SchemaManager (alternate modular schema system)', () => {
  let connectionManager: ConnectionManager;

  beforeEach(() => {
    connectionManager = new ConnectionManager({ databasePath: ':memory:' });
  });

  afterEach(async () => {
    await connectionManager.disconnect();
  });

  describe('ConnectionManager.getSchemaDatabase', () => {
    it('returns null before connecting', () => {
      expect(connectionManager.getSchemaDatabase()).toBeNull();
    });

    it('returns an IDatabase-compatible adapter once connected', async () => {
      await connectionManager.connect();
      const db = connectionManager.getSchemaDatabase();
      expect(db).not.toBeNull();
      // The schema modules call run/exec/all/get as async methods on the db.
      expect(typeof db!.run).toBe('function');
      expect(typeof db!.exec).toBe('function');
      expect(typeof db!.all).toBe('function');
      expect(typeof db!.get).toBe('function');

      // run() must resolve to the { lastID, changes } shape, not throw.
      await expect(db!.run('INSERT INTO messages (messageId) VALUES (?)', ['m1'])).resolves.toEqual(
        expect.objectContaining({ changes: expect.any(Number) })
      );
    });

    it('getDatabase() remains backwards-compatible and returns the adapter', async () => {
      await connectionManager.connect();
      const db = connectionManager.getDatabase();
      expect(db).not.toBeNull();
      expect(typeof db!.exec).toBe('function');
    });

    it('getRawDatabase() exposes the underlying handle', async () => {
      await connectionManager.connect();
      expect(connectionManager.getRawDatabase()).not.toBeNull();
    });
  });

  describe('initializeSchema', () => {
    it('throws a clear error when the connection is not established', async () => {
      const manager = new SchemaManager(connectionManager);
      await expect(manager.initializeSchema()).rejects.toThrow(
        'Database connection not established'
      );
    });

    it('drives every registered schema module without error once connected', async () => {
      await connectionManager.connect();

      // Spy on each module's create hooks to prove they are all invoked.
      const createTablesSpies = SchemaRegistry.filter((m) => m.createTables).map((m) =>
        jest.spyOn(m, 'createTables' as never)
      );
      const createIndexesSpies = SchemaRegistry.filter((m) => m.createIndexes).map((m) =>
        jest.spyOn(m, 'createIndexes' as never)
      );

      const manager = new SchemaManager(connectionManager);
      await expect(manager.initializeSchema()).resolves.toBeUndefined();

      expect(createTablesSpies.length).toBeGreaterThan(0);
      for (const spy of createTablesSpies) {
        expect(spy).toHaveBeenCalledTimes(1);
      }
      for (const spy of createIndexesSpies) {
        expect(spy).toHaveBeenCalledTimes(1);
      }
    });
  });
});
