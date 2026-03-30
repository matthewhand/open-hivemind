import { MCPSchemaRegistry } from '@src/mcp/schemas/MCPSchemaRegistry';

describe('MCPSchemaRegistry', () => {
  let registry: MCPSchemaRegistry;

  beforeEach(() => {
    // Reset instance for each test
    (MCPSchemaRegistry as any).instance = undefined;
    registry = MCPSchemaRegistry.getInstance();
  });

  it('should be a singleton', () => {
    const instance2 = MCPSchemaRegistry.getInstance();
    expect(registry).toBe(instance2);
  });

  it('should register a schema and validate matching arguments', () => {
    const serverName = 'test-server';
    const toolName = 'test-tool';
    const schema = {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number' }
      },
      required: ['query']
    };

    registry.registerToolSchema(serverName, toolName, schema);

    // Should not throw
    expect(() => {
      registry.validateToolArguments(serverName, toolName, { query: 'hello', limit: 10 });
    }).not.toThrow();
  });

  it('should throw an error for malformed arguments', () => {
    const serverName = 'test-server';
    const toolName = 'test-tool';
    const schema = {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query']
    };

    registry.registerToolSchema(serverName, toolName, schema);

    expect(() => {
      registry.validateToolArguments(serverName, toolName, { limit: 10 });
    }).toThrow('Validation failed for tool test-tool arguments: data must have required property \'query\'');
  });

  it('should not throw if tool is not registered', () => {
    expect(() => {
      registry.validateToolArguments('unknown-server', 'unknown-tool', { limit: 10 });
    }).not.toThrow();
  });
});
