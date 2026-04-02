import { injectable, singleton } from 'tsyringe';
import { Logger } from '@common/logger';
import type { ConnectionManager } from './ConnectionManager';
import { SchemaRegistry } from './schemas';

@singleton()
@injectable()
export class SchemaManager {
  private connectionManager: ConnectionManager;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
  }

  async initializeSchema(): Promise<void> {
    const db = this.connectionManager.getDatabase();
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Create all tables and indexes via SchemaRegistry
    for (const mod of SchemaRegistry) {
      if (mod.createTables) {
        await mod.createTables(db);
      }
    }

    for (const mod of SchemaRegistry) {
      if (mod.createIndexes) {
        await mod.createIndexes(db);
      }
    }

    Logger.info('Database schema initialized successfully');
  }
}
