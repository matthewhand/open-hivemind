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
import type { ISchemaModule } from './schemas/ISchemaModule';
import { LoggingSchemas } from './schemas/LoggingSchemas';
import { MetricsSchemas } from './schemas/MetricsSchemas';
import { MonitoringSchemas } from './schemas/MonitoringSchemas';
import { OperationsSchemas } from './schemas/OperationsSchemas';
import { SecuritySchemas } from './schemas/SecuritySchemas';
import { WorkflowSchemas } from './schemas/WorkflowSchemas';

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

    // All schema modules that follow the createTables/createIndexes pattern
    const schemaModules: ISchemaModule[] = [
      new ActivitySchemas(),
      new CoreSchemas(),
      new OperationsSchemas(),
      new IntegrationSchemas(),
      new WorkflowSchemas(),
      new AnalyticsSchemas(),
      new ComplianceSchemas(),
      new IncidentSchemas(),
      new DataManagementSchemas(),
      new SecuritySchemas(),
      new MetricsSchemas(),
      new LoggingSchemas(),
      new MonitoringSchemas(),
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
