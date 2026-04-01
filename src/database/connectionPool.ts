import { promises as fs } from 'fs';
import { join } from 'path';
import Debug from 'debug';
import { open, type Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { ConfigurationError, DatabaseError } from '@src/types/errorClasses';
import type { DatabaseConfig } from './types';

const debug = Debug('app:ConnectionPool');

export class ConnectionPool {
  private config?: DatabaseConfig;
  private configured = false;
  private connected = false;
  private db: Database | null = null;

  constructor(config?: DatabaseConfig) {
    if (config) {
      this.configure(config);
    }
  }

  configure(config: DatabaseConfig): void {
    this.config = config;
    this.configured = true;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  ensureConnected(): void {
    if (!this.configured) {
      throw new DatabaseError(
        'Database is not configured. Persistence features are currently disabled.',
        'DATABASE_NOT_CONFIGURED'
      );
    }

    if (!this.db || !this.connected) {
      throw new DatabaseError('Database not connected', 'DATABASE_NOT_CONNECTED');
    }
  }

  async connect(): Promise<Database | null> {
    try {
      debug('Connecting to database...');

      if (!this.config) {
        debug('Database configuration not provided; database features are disabled.');
        return null;
      }

      if (this.config.type === 'sqlite') {
        const dbPath = this.config.path || 'data/hivemind.db';

        // Ensure directory exists
        if (dbPath !== ':memory:') {
          const dbDir = join(dbPath, '..');
          await fs.mkdir(dbDir, { recursive: true });
        }

        this.db = await open({
          filename: dbPath,
          driver: sqlite3.Database,
        });
      } else {
        throw new ConfigurationError(
          `Database type ${this.config.type} not yet implemented`,
          'DATABASE_TYPE_NOT_SUPPORTED'
        );
      }

      this.connected = true;
      debug('Database connected successfully');
      return this.db;
    } catch (error) {
      debug('Database connection failed:', error);
      if (error instanceof DatabaseError || error instanceof ConfigurationError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_CONNECTION_FAILED'
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.db) {
        await this.db.close();
        this.db = null;
      }
      this.connected = false;
      debug('Database disconnected');
    } catch (error) {
      debug('Error disconnecting database:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getDb(): Database | null {
    return this.db;
  }
}
