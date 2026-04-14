import Database = require('better-sqlite3');

/**
 * Wrapper around better-sqlite3 providing an async/promise-based API
 * compatible with the previous sqlite package usage.
 */
export class SQLiteWrapper {
  private db: Database.Database;

  constructor(filename: string) {
    this.db = new Database(filename);
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
export type Database = SQLiteWrapper;
