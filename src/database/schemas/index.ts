import { ISchemaModule } from './ISchemaModule';
import { ActivitySchemas } from './ActivitySchemas';
import { MetricsSchemas } from './MetricsSchemas';
import { SecuritySchemas } from './SecuritySchemas';
import { DataManagementSchemas } from './DataManagementSchemas';

export class SchemaRegistry {
  private schemas: ISchemaModule[] = [];

  constructor() {
    this.register(new ActivitySchemas());
    this.register(new MetricsSchemas());
    this.register(new SecuritySchemas());
    this.register(new DataManagementSchemas());
  }

  public register(schema: ISchemaModule): void {
    this.schemas.push(schema);
  }

  public getSchemas(): ISchemaModule[] {
    return this.schemas;
  }
}

export * from './ISchemaModule';
export * from './ActivitySchemas';
export * from './MetricsSchemas';
export * from './SecuritySchemas';
export * from './DataManagementSchemas';
