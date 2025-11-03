import { Database } from 'sqlite3';
import { EventEmitter } from 'events';
import { Logger } from '../common/logger';

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
      Logger.warn('Database already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.db = new Database(this.options.databasePath, (err) => {
          if (err) {
            Logger.error(`Database connection error: ${err.message}`);
            this.emit('connectionError', err);
            reject(err);
            return;
          }

          Logger.info(`Connected to database: ${this.options.databasePath}`);
          this.isConnected = true;
          this.emit('connected');
          resolve();
        });

        if (this.options.timeout) {
          this.db.configure('busyTimeout', this.options.timeout);
        }
      } catch (error) {
        Logger.error(`Failed to connect to database: ${error.message}`);
        this.emit('connectionError', error);
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.db) {
      Logger.warn('Database not connected');
      return;
    }

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          Logger.error(`Error closing database: ${err.message}`);
          reject(err);
          return;
        }

        this.isConnected = false;
        this.db = null;
        Logger.info('Database connection closed');
        this.emit('disconnected');
        resolve();
      });
    });
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
        this.db!.run(query, params, function(err) {
          if (err) {
            Logger.error(`Query execution error: ${err.message}`);
            reject(err);
          } else {
            resolve({ lastID: this.lastID, changes: this.changes });
          }
        });
      } else {
        this.db!.run(query, function(err) {
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