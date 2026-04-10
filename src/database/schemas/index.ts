import { ActivitySchemas } from './ActivitySchemas';
import { AnalyticsSchemas } from './AnalyticsSchemas';
import { ComplianceSchemas } from './ComplianceSchemas';
import { CoreSchemas } from './CoreSchemas';
import { DataManagementSchemas } from './DataManagementSchemas';
import { IncidentSchemas } from './IncidentSchemas';
import { IntegrationSchemas } from './IntegrationSchemas';
import type { ISchemaModule } from './ISchemaModule';
import { LoggingSchemas } from './LoggingSchemas';
import { MetricsSchemas } from './MetricsSchemas';
import { MonitoringSchemas } from './MonitoringSchemas';
import { OperationsSchemas } from './OperationsSchemas';
import { SecuritySchemas } from './SecuritySchemas';
import { WorkflowSchemas } from './WorkflowSchemas';

export const SchemaRegistry: ISchemaModule[] = [
  new ActivitySchemas(),
  new AnalyticsSchemas(),
  new ComplianceSchemas(),
  new CoreSchemas(),
  new DataManagementSchemas(),
  new IncidentSchemas(),
  new IntegrationSchemas(),
  new LoggingSchemas(),
  new MetricsSchemas(),
  new MonitoringSchemas(),
  new OperationsSchemas(),
  new SecuritySchemas(),
  new WorkflowSchemas(),
];

export {
  ActivitySchemas,
  AnalyticsSchemas,
  ComplianceSchemas,
  CoreSchemas,
  DataManagementSchemas,
  IncidentSchemas,
  IntegrationSchemas,
  LoggingSchemas,
  MetricsSchemas,
  MonitoringSchemas,
  OperationsSchemas,
  SecuritySchemas,
  WorkflowSchemas,
};
