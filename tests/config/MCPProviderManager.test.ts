import { MCPProviderManager } from '../../src/config/mcp';
import { MCPProviderConfig } from '../../src/types/mcp';

describe('MCPProviderManager Configuration Validation', () => {
  let manager: MCPProviderManager;

  beforeEach(() => {
    // Tests currently instantiate it directly, so we need to inject dummy dependencies
    // or properly mock the tsyringe container.
    // Based on index.ts, we provide dummy instances for tests:
    const { ConfigLoader } = require('../../src/config/mcp/configLoader');
    const { ServerLifecycle } = require('../../src/config/mcp/serverLifecycle');
    const { ToolRegistry } = require('../../src/config/mcp/toolRegistry');

    manager = new MCPProviderManager(
      new ConfigLoader(),
      new ServerLifecycle(),
      new ToolRegistry()
    );
  });

  it('should validate valid provider configuration', () => {
    const config: Partial<MCPProviderConfig> = {
      name: 'Valid Provider',
      type: 'desktop',
      command: 'npx',
      // Casting to any to avoid TS error but now the bug is fixed in MCPProviderManager so it should handle strings or arrays properly if logic allows
      // The bug fix handles Array.isArray check properly.
      args: ['some-package'],
    };

    const result = manager.validateProviderConfig(config);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate valid provider with safe command', () => {
    const config: Partial<MCPProviderConfig> = {
      name: 'Safe Command Provider',
      type: 'desktop',
      command: '/usr/local/bin/node',
      args: ['script.js'],
    };

    const result = manager.validateProviderConfig(config);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject dangerous shell commands (fixing vulnerability)', () => {
    // These commands match the existing regexes but should be blocked for security
    const dangerousCommands = [
      '/bin/sh',
      '/bin/bash',
      'sh',
      'bash',
      'cmd',
      'powershell',
      // Mixed case bypass attempts
      '/bin/SH',
      'Cmd.exe',
      'PowerShell.exe',
      'BASH',
    ];

    dangerousCommands.forEach((command) => {
      const config: Partial<MCPProviderConfig> = {
        name: 'Dangerous Provider',
        type: 'desktop',
        command: command,
        args: ['-c', 'echo pwned'],
      };

      const result = manager.validateProviderConfig(config);
      if (result.isValid) {
        console.log(`Command failed to be blocked: ${command}`);
      }
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command is not allowed for security reasons');
    });
  });
});
