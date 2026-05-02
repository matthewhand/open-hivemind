import Debug from 'debug';
import { type IDatabase } from './types';

const debug = Debug('app:DatabaseMigrator');

export class CustomDbStorage {
  constructor(
    private db: IDatabase,
    private isPostgres: boolean
  ) {}

  async executed(): Promise<string[]> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS umzug_migrations (
        name ${this.isPostgres ? 'TEXT' : 'TEXT'} PRIMARY KEY,
        created_at ${this.isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT ${this.isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP'}
      )
    `);
    try {
      const rows = await this.db.all<{ name: string }>(
        'SELECT name FROM umzug_migrations ORDER BY name ASC'
      );
      return rows.map((r) => r.name);
    } catch {
      // In case table creation failed or isn't available yet
      return [];
    }
  }

  async logMigration({ name }: { name: string }): Promise<void> {
    await this.db.run('INSERT INTO umzug_migrations (name) VALUES (?)', [name]);
  }

  async unlogMigration({ name }: { name: string }): Promise<void> {
    await this.db.run('DELETE FROM umzug_migrations WHERE name = ?', [name]);
  }
}

export const runMigrations = async (db: IDatabase, isPostgres: boolean): Promise<void> => {
  debug('Initializing migrator...');

  // Lazy load Umzug to avoid crashing tests that mock fs
  const { Umzug } = await import('umzug');

  const migrations = [
    {
      name: '000_initial_schema.ts',

      up: async ({ context }: { context: { db: IDatabase; isPostgres: boolean } }) => {
        const { up } = await import('./migrations/000_initial_schema');
        await up(context);
      },

      down: async () => {
        // Not implemented for baseline
      },
    },
    {
      name: '001_add_missing_indexes.ts',

      up: async ({ context }: { context: { db: IDatabase; isPostgres: boolean } }) => {
        const { up } = await import('./migrations/001_add_missing_indexes');
        await up(context);
      },

      down: async ({ context }: { context: { db: IDatabase; isPostgres: boolean } }) => {
        const { down } = await import('./migrations/001_add_missing_indexes');
        await down(context);
      },
    },
  ];

  const umzug = new Umzug({
    migrations,
    context: { db, isPostgres },
    storage: new CustomDbStorage(db, isPostgres),
    logger: console,
  });

  try {
    const executed = await umzug.up();
    if (executed.length > 0) {
      debug(`Successfully applied migrations: ${executed.map((m) => m.name).join(', ')}`);
    } else {
      debug('Database is up to date.');
    }
  } catch (error) {
    debug('Migration failed:', error);
    throw error;
  }
};
