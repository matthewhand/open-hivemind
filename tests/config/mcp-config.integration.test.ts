import 'reflect-metadata';
import { MCPProviderManager } from '../../src/config/MCPProviderManager';
import { ConfigLoader } from '../../src/config/mcp/configLoader';
import { ServerLifecycle } from '../../src/config/mcp/serverLifecycle';
import { ToolRegistry } from '../../src/config/mcp/toolRegistry';
import { container } from 'tsyringe';
import { registerServices } from '../../src/di/registration';
import path from 'path';
import fs from 'fs';

describe('MCP Configuration Integration', () => {
  let manager: MCPProviderManager;
  const testConfigDir = path.join(process.cwd(), 'config', 'mcp-test');

  beforeAll(() => {
    registerServices();
    
    // Explicitly register dependencies to avoid TypeInfo errors in tests
    container.registerSingleton(ConfigLoader);
    container.registerSingleton(ServerLifecycle);
    container.registerSingleton(ToolRegistry);
    container.registerSingleton(MCPProviderManager);

    manager = container.resolve(MCPProviderManager);
  });

  it('should validate desktop providers correctly', () => {
    const validConfig = {
      name: 'Test Server',
      type: 'desktop' as const,
      command: 'npx',
      args: ['some-server'],
      enabled: true
    };

    const result = manager.validateProviderConfig(validConfig);
    expect(result.isValid).toBe(true);
  });

  it('should block dangerous commands in validation', () => {
    const dangerousConfig = {
      name: 'Evil Server',
      type: 'desktop' as const,
      command: 'rm',
      args: ['-rf', '/'],
      enabled: true
    };

    const result = manager.validateProviderConfig(dangerousConfig);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Command is not allowed for security reasons');
  });

  it('should provide available templates', () => {
    const templates = manager.getTemplates();
    expect(Array.isArray(templates)).toBe(true);
    if (templates.length > 0) {
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('name');
    }
  });
});
