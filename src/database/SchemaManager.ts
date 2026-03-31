import type { Database } from 'sqlite';
import { injectable, singleton } from 'tsyringe';
import { Logger } from '@common/logger';
import type { ConnectionManager } from './ConnectionManager';
import { ActivitySchemas } from './schemas/ActivitySchemas';
import { AnalyticsSchemas } from './schemas/AnalyticsSchemas';
import { ComplianceSchemas } from './schemas/ComplianceSchemas';
import { CoreSchemas } from './schemas/CoreSchemas';
import { DataManagementSchemas } from './schemas/DataManagementSchemas';
import { IncidentSchemas } from './schemas/IncidentSchemas';
import { IntegrationSchemas } from './schemas/IntegrationSchemas';
import { MetricsSchemas } from './schemas/MetricsSchemas';
import { OperationsSchemas } from './schemas/OperationsSchemas';
import { WorkflowSchemas } from './schemas/WorkflowSchemas';
import type { ISchemaModule } from './schemas/ISchemaModule';

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

    // Create modular schemas
    const activitySchemas = new ActivitySchemas();
    await activitySchemas.ensureTable(db);

    // All schema modules that follow the createTables/createIndexes pattern
    const schemaModules: ISchemaModule[] = [
      new CoreSchemas(),
      new OperationsSchemas(),
      new IntegrationSchemas(),
      new WorkflowSchemas(),
      new AnalyticsSchemas(),
      new ComplianceSchemas(),
      new IncidentSchemas(),
      new DataManagementSchemas(),
      new MetricsSchemas(),
    ];

    // Create all tables
    for (const mod of schemaModules) {
      if (mod.createTables) {
        await mod.createTables(db);
      }
    }

    // Create all indexes
    for (const mod of schemaModules) {
      if (mod.createIndexes) {
        await mod.createIndexes(db);
      }
    }

    Logger.info('Database schema initialized successfully');
  }
}
