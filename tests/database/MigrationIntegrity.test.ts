import { MigrationManager } from '../../src/database/MigrationManager';

describe('Migration Integrity', () => {
  let db: any;
  let migrationManager: MigrationManager;

  beforeAll(async () => {
    // To truly bypass Jest's complex global mock routing for sqlite/sqlite3 modules
    // inside unit test mode, we must fetch the raw driver using absolute path.
    // The previous tests failed to execute SQL against memory because `jest.requireActual`
    // returned mocked structures for `open` or `Database`.
    const path = require('path');
    const sqlite3Raw = require(path.resolve(process.cwd(), 'node_modules/sqlite3/lib/sqlite3.js'));
    const { open } = require(path.resolve(process.cwd(), 'node_modules/sqlite/build/index.js'));

    // Open a real in-memory SQLite database
    db = await open({
      filename: ':memory:',
      driver: sqlite3Raw.Database,
    });

    const createBaseTables = `
      CREATE TABLE bot_configurations (id INTEGER PRIMARY KEY);
      CREATE TABLE bot_configuration_versions (id INTEGER PRIMARY KEY);
      CREATE TABLE bot_configuration_audit (id INTEGER PRIMARY KEY);
      CREATE TABLE messages (id INTEGER PRIMARY KEY);
      CREATE TABLE bot_sessions (id INTEGER PRIMARY KEY);
      CREATE TABLE bot_metrics (id INTEGER PRIMARY KEY);
      CREATE TABLE roles (id INTEGER PRIMARY KEY, tenantId TEXT);
      CREATE TABLE users (id INTEGER PRIMARY KEY, tenantId TEXT);
      CREATE TABLE audits (id INTEGER PRIMARY KEY, tenantId TEXT, userId TEXT, action TEXT, resource TEXT);
      CREATE TABLE tenants (id TEXT PRIMARY KEY);
      CREATE TABLE bot_scheduling (id INTEGER PRIMARY KEY);
      CREATE TABLE bot_backup_schedules (id INTEGER PRIMARY KEY);
      CREATE TABLE bot_data_purging_schedules (id INTEGER PRIMARY KEY);
    `;
    await db.exec(createBaseTables);

    migrationManager = new MigrationManager(db);
  });

  afterAll(async () => {
    if (db) {
      await db.close();
    }
  });

  beforeEach(() => {
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should run all up migrations successfully against a real DB', async () => {
    await migrationManager.runMigrations();

    // Verify a new table was created
    const anomalyTable = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='anomaly_detection'"
    );
    expect(anomalyTable).toBeDefined();
    expect(anomalyTable.name).toBe('anomaly_detection');

    // Verify columns were added (e.g., tenantId to bot_configurations)
    const botConfigCols = await db.all('PRAGMA table_info(bot_configurations)');
    const tenantIdCol = botConfigCols.find((col: any) => col.name === 'tenantId');
    expect(tenantIdCol).toBeDefined();

    // Verify index was created
    const indexCheck = await db.get(
      "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_bot_configurations_tenant'"
    );
    expect(indexCheck).toBeDefined();
  });

  it('should run all down migrations successfully against a real DB', async () => {
    // Ensure migrations exist in the tracking table
    const executedBefore = await migrationManager.getExecutedMigrations();
    expect(executedBefore.length).toBeGreaterThan(0);

    // Rollback all migrations to version 0
    await migrationManager.rollbackToVersion(0);

    // Verify the newly created table was removed
    const anomalyTable = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='anomaly_detection'"
    );
    expect(anomalyTable).toBeUndefined();

    // Verify the index was dropped
    const indexCheck = await db.get(
      "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_bot_configurations_tenant'"
    );
    expect(indexCheck).toBeUndefined();

    // Verify tracking table is clean
    const executedAfter = await migrationManager.getExecutedMigrations();
    expect(executedAfter.length).toBe(0);
  });
});
