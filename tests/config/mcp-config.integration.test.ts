import { MCPProviderManager } from '../../src/config/MCPProviderManager';
import path from 'path';
import fs from 'fs';

describe('MCP Configuration Integration', () => {
  let manager: MCPProviderManager;
  const testConfigDir = path.join(process.cwd(), 'config', 'mcp-test');

  beforeAll(() => {
    // We use the singleton but we can't easily override its path without hacks
    // so we'll test the logic via the public API
    manager = MCPProviderManager.getInstance();
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
