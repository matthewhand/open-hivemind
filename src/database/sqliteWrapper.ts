import Database from 'better-sqlite3';
import Debug from 'debug';
import { IDatabase } from './types';

const debug = Debug('app:SQLiteWrapper');

/**
 * Wrapper around better-sqlite3 providing an async/promise-based API
 * compatible with the previous sqlite package usage.
 */
export class SQLiteWrapper implements IDatabase {
  private db: any;

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
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    const stmt = this.db.prepare(sql);
    const info = params.length > 0 ? stmt.run(...params) : stmt.run();
    return { lastID: info.lastInsertRowid as number, changes: info.changes };
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return (params.length > 0 ? stmt.all(...params) : stmt.all()) as T[];
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const stmt = this.db.prepare(sql);
    return (params.length > 0 ? stmt.get(...params) : stmt.get()) as T | undefined;
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

// Re-export the better-sqlite3 Database type for compatibility
export type { Database as DatabaseType };

// Type alias for compatibility with existing code that imported Database from 'sqlite'
export type Database = IDatabase;
