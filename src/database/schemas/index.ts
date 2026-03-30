import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import { ISchemaModule } from './ISchemaModule';
import { ActivitySchemas } from './ActivitySchemas';
import { MetricsSchemas } from './MetricsSchemas';
import { SecuritySchemas } from './SecuritySchemas';
import { BotManagementSchemas } from './BotManagementSchemas';

export * from './ISchemaModule';
export * from './ActivitySchemas';
export * from './MetricsSchemas';
export * from './SecuritySchemas';
export * from './BotManagementSchemas';

export class SchemaRegistry {
  private schemas: ISchemaModule[];

  constructor() {
    this.schemas = [
      new ActivitySchemas(),
      new MetricsSchemas(),
      new SecuritySchemas(),
      new BotManagementSchemas(),
    ];
  }

  getSchemas(): ISchemaModule[] {
    return this.schemas;
  }

  async initializeSchemas(db: Database): Promise<void> {
    Logger.info('Initializing all modular schemas');

    // Ensure backwards compatibility with modules using ensureTable
    for (const schema of this.schemas) {
      if (schema.ensureTable) {
        await schema.ensureTable(db);
      }
    }

    // Initialize schemas using createTables
    for (const schema of this.schemas) {
      if (schema.createTables) {
        await schema.createTables(db);
      }
    }

    // Initialize schemas using createIndexes
    for (const schema of this.schemas) {
      if (schema.createIndexes) {
        await schema.createIndexes(db);
      }
    }

    Logger.info('All modular schemas initialized successfully');
  }

  getAllTableNames(): string[] {
    let allTableNames: string[] = [];
    for (const schema of this.schemas) {
      if (schema.getTableNames) {
        allTableNames = [...allTableNames, ...schema.getTableNames()];
      }
    }
    return allTableNames;
  }
}
