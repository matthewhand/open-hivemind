import Database, { type Database as BetterSqliteDatabase } from 'better-sqlite3';
import Debug from 'debug';
import { type IDatabase } from './types';

const debug = Debug('app:SQLiteWrapper');

/**
 * Wrapper around better-sqlite3 providing an async/promise-based API
 * compatible with the previous sqlite package usage.
 */
export class SQLiteWrapper implements IDatabase {
  private db: BetterSqliteDatabase;

  constructor(filename: string) {
    debug('SQLITE_WRAPPER: constructor called for', filename);

    let DBConstructor: any;

    // Try different ways better-sqlite3 might be exported/imported
    if (typeof Database === 'function') {
      DBConstructor = Database;
    } else if (Database && typeof (Database as any).default === 'function') {
      DBConstructor = (Database as any).default;
    } else {
      try {
        // Direct require as fallback

        const BetterSqlite3 = require('better-sqlite3');
        DBConstructor = typeof BetterSqlite3 === 'function' ? BetterSqlite3 : BetterSqlite3.default;
      } catch (e) {
        throw new Error(
          `Failed to load better-sqlite3: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    if (typeof DBConstructor !== 'function') {
      throw new Error('better-sqlite3 export is not a constructor');
    }

    this.db = new DBConstructor(filename);
    this.applyPragmas();
  }

  private applyPragmas(): void {
    try {
      // WAL gives concurrent reads alongside a single writer.
      this.db.pragma('journal_mode = WAL');
      // synchronous=NORMAL is durable across crashes when paired with WAL and
      // significantly faster than FULL.
      this.db.pragma('synchronous = NORMAL');
      // Without this every FOREIGN KEY constraint declared in migrations is inert.
      this.db.pragma('foreign_keys = ON');
      // Wait up to 5s for a competing writer instead of failing immediately.
      this.db.pragma('busy_timeout = 5000');
      // Keep temp tables/indexes in memory rather than spilling to disk.
      this.db.pragma('temp_store = MEMORY');
      // 64MB page cache (negative value = KB).
      this.db.pragma('cache_size = -64000');
      debug('Applied SQLite PRAGMAs: WAL, synchronous=NORMAL, foreign_keys=ON');
    } catch (e) {
      debug('Failed to apply one or more PRAGMAs (continuing):', e);
    }
  }

  async run(sql: string, params: unknown[] = []): Promise<{ lastID: number; changes: number }> {
    try {
      const stmt = this.db.prepare(sql);
      const info = params.length > 0 ? stmt.run(...params) : stmt.run();
      return { lastID: info.lastInsertRowid as number, changes: info.changes };
    } catch (err) {
      console.error('SQLiteWrapper.run ERROR:', err, 'SQL:', sql);
      throw err;
    }
  }

  async all<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return (params.length > 0 ? stmt.all(...params) : stmt.all()) as T[];
  }

  async get<T = unknown>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const stmt = this.db.prepare(sql);
    return (params.length > 0 ? stmt.get(...params) : stmt.get()) as T | undefined;
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async transaction<T>(callback: (db: IDatabase) => Promise<T>): Promise<T> {
    await this.exec('BEGIN TRANSACTION');
    try {
      const result = await callback(this);
      await this.exec('COMMIT');
      return result;
    } catch (e) {
      await this.exec('ROLLBACK');
      throw e;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

// Re-export the better-sqlite3 Database type for compatibility
export type { Database as DatabaseType };

// Type alias for compatibility with existing code that imported Database from 'sqlite'
export type Database = IDatabase;
