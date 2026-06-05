import { EventEmitter } from 'events';
import { Logger } from '@common/logger';
import type { IDatabase } from './types';

import Database = require('better-sqlite3');

interface ConnectionOptions {
  databasePath: string;
  readonly?: boolean;
  timeout?: number;
}

/** Result shape returned by executeQuery (INSERT/UPDATE/DELETE). */
export interface QueryResult {
  lastID: number;
  changes: number;
}

/** Primitive types accepted as SQL bind parameters. */
export type SqlParam = string | number | boolean | null | Buffer;

export class ConnectionManager extends EventEmitter {
  private db: Database.Database | null = null;
  private isConnected = false;
  private options: ConnectionOptions;

  constructor(options: ConnectionOptions) {
    super();
    this.options = options;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      Logger.info('Database already connected');
      return;
    }

    try {
      this.db = new Database(this.options.databasePath, {
        readonly: this.options.readonly,
        timeout: this.options.timeout || 5000,
      });

      this.isConnected = true;
      Logger.info(`Connected to database: ${this.options.databasePath}`);
      this.emit('connected');
    } catch (error) {
      const err = error as Error;
      Logger.error(`Failed to connect to database: ${err.message}`);
      this.emit('connectionError', err);
      throw err; // Re-throw the error to the caller
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.db) {
      Logger.info('Database not connected');
      return;
    }
    try {
      this.db.close();
      this.isConnected = false;
      this.db = null;
      Logger.info('Database connection closed');
      this.emit('disconnected');
    } catch (error) {
      const err = error as Error;
      Logger.error(`Error closing database: ${err.message}`);
      this.emit('closeError', err);
      throw err; // Re-throw the error to the caller
    }
  }

  /**
   * Returns the raw underlying better-sqlite3 database handle (or null).
   *
   * Prefer {@link getSchemaDatabase} for schema-creation work — the raw handle
   * exposes a synchronous API (`run`/`get` live on prepared statements, not the
   * database object) that is NOT compatible with the {@link IDatabase} contract
   * expected by the schema modules.
   */
  getRawDatabase(): Database.Database | null {
    return this.db;
  }

  /**
   * Returns an {@link IDatabase}-compatible adapter over the raw connection, or
   * `null` when not connected.
   *
   * The schema modules in `schemas/*` are written against the async
   * `IDatabase` contract (`run`/`exec`/`all`/`get` return promises). The raw
   * better-sqlite3 handle does not satisfy that contract, so this adapter
   * bridges the two. This keeps {@link SchemaManager} usable on demand without
   * coupling it to a specific wrapper implementation.
   */
  getSchemaDatabase(): IDatabase | null {
    const db = this.db;
    if (!db) {
      return null;
    }

    const adapter: IDatabase = {
      async run(sql: string, params: unknown[] = []) {
        const stmt = db.prepare(sql);
        const info = params.length > 0 ? stmt.run(...(params as SqlParam[])) : stmt.run();
        return { lastID: info.lastInsertRowid as number, changes: info.changes };
      },
      async all<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
        const stmt = db.prepare(sql);
        return (params.length > 0 ? stmt.all(...(params as SqlParam[])) : stmt.all()) as T[];
      },
      async get<T = unknown>(sql: string, params: unknown[] = []): Promise<T | undefined> {
        const stmt = db.prepare(sql);
        return (params.length > 0 ? stmt.get(...(params as SqlParam[])) : stmt.get()) as
          | T
          | undefined;
      },
      async exec(sql: string) {
        db.exec(sql);
      },
      async transaction<T>(callback: (txnDb: IDatabase) => Promise<T>): Promise<T> {
        await adapter.exec('BEGIN TRANSACTION');
        try {
          const result = await callback(adapter);
          await adapter.exec('COMMIT');
          return result;
        } catch (e) {
          await adapter.exec('ROLLBACK');
          throw e;
        }
      },
      async close() {
        db.close();
      },
    };

    return adapter;
  }

  /**
   * @deprecated Use {@link getSchemaDatabase} (IDatabase-compatible) or
   * {@link getRawDatabase} (raw handle) instead. Retained for backwards
   * compatibility; returns the IDatabase adapter.
   */
  getDatabase(): IDatabase | null {
    return this.getSchemaDatabase();
  }

  isConnectedToDatabase(): boolean {
    return this.isConnected;
  }

  async executeQuery(query: string, params?: SqlParam[]): Promise<QueryResult> {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not connected');
    }

    try {
      const stmt = this.db.prepare(query);
      const result = params && params.length > 0 ? stmt.run(...params) : stmt.run();
      return { lastID: result.lastInsertRowid as number, changes: result.changes };
    } catch (err) {
      Logger.error(`Query execution error: ${(err as Error).message}`);
      throw err;
    }
  }

  async selectQuery(query: string, params?: SqlParam[]): Promise<Record<string, unknown>[]> {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not connected');
    }

    try {
      const stmt = this.db.prepare(query);
      const rows = params && params.length > 0 ? stmt.all(...params) : stmt.all();
      return rows as Record<string, unknown>[];
    } catch (err) {
      Logger.error(`Select query error: ${(err as Error).message}`);
      throw err;
    }
  }
}
