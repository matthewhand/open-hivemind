import { EventEmitter } from 'events';
import { open, type Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { Logger } from '@common/logger';

export interface ConnectionOptions {
  databasePath: string;
  readonly?: boolean;
  timeout?: number;
}

export class ConnectionManager extends EventEmitter {
  private db: Database | null = null;
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
      this.db = await open({
        filename: this.options.databasePath,
        driver: sqlite3.Database,
      });

      if (this.options.timeout) {
        await this.db.configure('busyTimeout', this.options.timeout);
      }

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
      await this.db.close();
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

  getDatabase(): Database | null {
    return this.db;
  }

  isConnectedToDatabase(): boolean {
    return this.isConnected;
  }

  async executeQuery(query: string, params?: any[]): Promise<any> {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      if (params && params.length > 0) {
        this.db!.run(query, params, function (err) {
          if (err) {
            Logger.error(`Query execution error: ${err.message}`);
            reject(err);
          } else {
            resolve({ lastID: this.lastID, changes: this.changes });
          }
        });
      } else {
        this.db!.run(query, function (err) {
          if (err) {
            Logger.error(`Query execution error: ${err.message}`);
            reject(err);
          } else {
            resolve({ lastID: this.lastID, changes: this.changes });
          }
        });
      }
    });
  }

  async selectQuery(query: string, params?: any[]): Promise<any[]> {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      if (params && params.length > 0) {
        this.db!.all(query, params, (err, rows) => {
          if (err) {
            Logger.error(`Select query error: ${err.message}`);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      } else {
        this.db!.all(query, (err, rows) => {
          if (err) {
            Logger.error(`Select query error: ${err.message}`);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      }
    });
  }
}
