import { SchemaRegistry } from '../../../src/database/schemas/index';
import type { ISchemaModule } from '../../../src/database/schemas/ISchemaModule';
import { LoggingSchemas } from '../../../src/database/schemas/LoggingSchemas';
import { MonitoringSchemas } from '../../../src/database/schemas/MonitoringSchemas';

describe('LoggingSchemas', () => {
  let schema: LoggingSchemas;

  beforeEach(() => {
    schema = new LoggingSchemas();
  });

  it('implements ISchemaModule interface', () => {
    expect(typeof schema.createTables).toBe('function');
  });

  it('createTables executes SQL for activity_logs and related tables', async () => {
    const executedSQL: string[] = [];
    const mockDb = {
      exec: jest.fn().mockImplementation((sql: string) => {
        executedSQL.push(sql);
        return Promise.resolve();
      }),
      run: jest.fn().mockResolvedValue(undefined),
    } as any;

    await schema.createTables(mockDb);

    const allSQL = executedSQL.join('\n');
    expect(allSQL).toContain('activity_logs');
    expect(mockDb.exec).toHaveBeenCalled();
  });
});

describe('MonitoringSchemas', () => {
  let schema: MonitoringSchemas;

  beforeEach(() => {
    schema = new MonitoringSchemas();
  });

  it('implements ISchemaModule interface', () => {
    expect(typeof schema.createTables).toBe('function');
  });

  it('createTables executes SQL for health_checks and related tables', async () => {
    const executedSQL: string[] = [];
    const mockDb = {
      exec: jest.fn().mockImplementation((sql: string) => {
        executedSQL.push(sql);
        return Promise.resolve();
      }),
      run: jest.fn().mockResolvedValue(undefined),
    } as any;

    await schema.createTables(mockDb);

    const allSQL = executedSQL.join('\n');
    expect(allSQL).toContain('health_checks');
    expect(mockDb.exec).toHaveBeenCalled();
  });
});

describe('SchemaRegistry', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(SchemaRegistry)).toBe(true);
    expect(SchemaRegistry.length).toBeGreaterThan(0);
  });

  it('every entry implements ISchemaModule (has createTables)', () => {
    SchemaRegistry.forEach((module: ISchemaModule) => {
      expect(typeof module.createTables).toBe('function');
    });
  });

  it('includes LoggingSchemas and MonitoringSchemas', () => {
    const names = SchemaRegistry.map((m) => m.constructor.name);
    expect(names).toContain('LoggingSchemas');
    expect(names).toContain('MonitoringSchemas');
  });

  it('has no duplicate schema module types', () => {
    const names = SchemaRegistry.map((m) => m.constructor.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});
