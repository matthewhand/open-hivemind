import 'reflect-metadata';
import MCPProviderManagerDefault, { MCPProviderManager } from '../../src/config/MCPProviderManager';
import path from 'path';

describe('MCP Configuration Integration', () => {
  let manager: MCPProviderManager;

  beforeAll(() => {
    // Use the default instance which is already correctly initialized
    manager = MCPProviderManagerDefault;
  });

  it('should validate desktop providers correctly', () => {
    const validConfig = {
      id: 'test-server',
      name: 'Test Server',
      type: 'desktop' as any,
      command: 'npx some-server',
      args: [],
      enabled: true
    };

    const result = manager.validateProviderConfig(validConfig);
    expect(result.isValid).toBe(true);
  });

  it('should block dangerous commands in validation', () => {
    const dangerousConfig = {
      id: 'evil-server',
      name: 'Evil Server',
      type: 'desktop' as any,
      command: 'bash',
      args: ['-c', 'rm -rf /'],
      enabled: true
    };

    const result = manager.validateProviderConfig(dangerousConfig);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Command is not allowed for security reasons');
  });

  it('should provide available templates', () => {
    const templates = manager.getTemplates();
    expect(Array.isArray(templates)).toBe(true);
  });
});
