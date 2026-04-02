import { ConfigLoader } from '../../src/config/mcp/configLoader';
import { ToolRegistry } from '../../src/config/mcp/toolRegistry';
import type { MCPProviderConfig } from '../../src/types/mcp';

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ConfigLoader', () => {
  let loader: ConfigLoader;

  beforeEach(() => {
    loader = new ConfigLoader();
  });

  it('validates a valid desktop provider config', () => {
    const result = loader.validateProviderConfig({
      name: 'My Server',
      type: 'desktop',
      command: 'npx',
      args: ['some-mcp-server'],
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects missing name', () => {
    const result = loader.validateProviderConfig({
      type: 'desktop',
      command: 'npx',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Provider name is required and must be at least 2 characters');
  });

  it('rejects missing command', () => {
    const result = loader.validateProviderConfig({
      name: 'My Server',
      type: 'desktop',
      command: '',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Command is required');
  });

  it('rejects invalid provider type', () => {
    const result = loader.validateProviderConfig({
      name: 'My Server',
      type: 'invalid' as any,
      command: 'npx',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Provider type must be either "desktop" or "cloud"');
  });

  it('blocks dangerous shell commands', () => {
    const dangerous = ['sh', 'bash', '/bin/sh', '/bin/bash', 'cmd', 'powershell'];
    for (const cmd of dangerous) {
      const result = loader.validateProviderConfig({
        name: 'My Server',
        type: 'desktop',
        command: cmd,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command is not allowed for security reasons');
    }
  });

  it('rejects timeout outside 5-300 range', () => {
    const result = loader.validateProviderConfig({
      name: 'My Server',
      type: 'desktop',
      command: 'npx',
      timeout: 400,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Timeout must be a number between 5 and 300 seconds');
  });

  it('warns cloud providers without connection config', () => {
    const result = loader.validateProviderConfig({
      name: 'Cloud Server',
      type: 'cloud',
      command: 'npx',
    });
    expect(result.warnings).toContain(
      'Cloud providers typically require connection configuration (URLs, API keys, etc.)'
    );
  });

  it('suggests health checks when not enabled', () => {
    const result = loader.validateProviderConfig({
      name: 'My Server',
      type: 'desktop',
      command: 'npx',
    });
    expect(result.suggestions).toContain(
      'Consider enabling health checks for better reliability'
    );
  });
});

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('returns templates array', () => {
    const templates = registry.getTemplates();
    expect(Array.isArray(templates)).toBe(true);
  });

  it('createFromTemplate returns a config with overrides applied', () => {
    const templates = registry.getTemplates();
    if (templates.length === 0) {
      // No templates available — skip
      return;
    }
    const template = templates[0];
    const config = registry.createFromTemplate(template.id, { name: 'Custom Name' });
    expect(config.name).toBe('Custom Name');
  });
});
