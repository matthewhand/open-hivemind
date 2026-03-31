import type { Database } from 'sqlite';
import { ActivitySchemas } from './ActivitySchemas';
import { MetricsSchemas } from './MetricsSchemas';
import { SecuritySchemas } from './SecuritySchemas';
import { BotSchemas } from './BotSchemas';
import type { ISchemaModule } from './ISchemaModule';

export class SchemaRegistry {
  private modules: ISchemaModule[];

  constructor() {
    this.modules = [
      new ActivitySchemas(),
      new MetricsSchemas(),
      new SecuritySchemas(),
      new BotSchemas(),
    ];
  }

  async initializeAll(db: Database): Promise<void> {
    // 1. Ensure tables (legacy or specific setup, mostly ActivitySchemas uses this)
    for (const mod of this.modules) {
      if (mod.ensureTable) {
        await mod.ensureTable(db);
      }
    }

    // 2. Create tables
    for (const mod of this.modules) {
      if (mod.createTables) {
        await mod.createTables(db);
      }
    }

    // 3. Create indexes
    for (const mod of this.modules) {
      if (mod.createIndexes) {
        await mod.createIndexes(db);
      }
    }
  }
}
