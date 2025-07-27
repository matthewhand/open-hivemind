/**
 * @file reconstructCommandFromAlias.test.ts
 * @description Comprehensive test suite for reconstructCommandFromAlias utility functions
 * 
 * Tests all exported functions including:
 * - resolveAlias: Resolves aliases to commands
 * - reconstructCommand: Reconstructs full commands from aliases and arguments
 * - getAliasDescription: Retrieves descriptions for aliases
 * - listAliases: Lists all available aliases
 * 
 * @module tests/reconstructCommandFromAlias
 * @category Testing
 */

import {
  resolveAlias,
  reconstructCommand,
  getAliasDescription,
  listAliases,
  Alias,
  AliasMapping
} from '../../../../src/message/helpers/commands/reconstructCommandFromAlias';

// Mock debug module
jest.mock('debug', () => {
  return jest.fn(() => jest.fn());
});

describe('reconstructCommandFromAlias', () => {
  let mockAliases: AliasMapping;

  beforeEach(() => {
    // Reset aliases before each test
    mockAliases = {
      'help': { command: 'show help', description: 'Display help information' },
      'h': { command: 'show help', description: 'Display help information (short)' },
      'greet': { command: 'send greeting', description: 'Send a greeting message' },
      'status': { command: 'get system status', description: 'Check system status' },
      'restart': { command: 'restart service', description: 'Restart the bot service' }
    };
  });

  describe('resolveAlias', () => {
    it('should resolve existing aliases to their commands', () => {
      expect(resolveAlias('help', mockAliases)).toBe('show help');
      expect(resolveAlias('greet', mockAliases)).toBe('send greeting');
      expect(resolveAlias('status', mockAliases)).toBe('get system status');
    });

    it('should return the original alias when alias is not found', () => {
      expect(resolveAlias('unknown', mockAliases)).toBe('unknown');
      expect(resolveAlias('nonexistent', mockAliases)).toBe('nonexistent');
    });

    it('should handle empty alias string', () => {
      expect(resolveAlias('', mockAliases)).toBe('');
    });

    it('should handle case-sensitive alias matching', () => {
      expect(resolveAlias('HELP', mockAliases)).toBe('HELP');
      expect(resolveAlias('Help', mockAliases)).toBe('Help');
    });

    it('should handle empty aliases mapping', () => {
      expect(resolveAlias('help', {})).toBe('help');
      expect(resolveAlias('any', {})).toBe('any');
    });

    it('should handle aliases with special characters', () => {
      const specialAliases = {
        'cmd-with-dash': { command: 'command with dash', description: 'Test dash' },
        'cmd_with_underscore': { command: 'command with underscore', description: 'Test underscore' },
        'cmd.with.dot': { command: 'command with dot', description: 'Test dot' }
      };
      
      expect(resolveAlias('cmd-with-dash', specialAliases)).toBe('command with dash');
      expect(resolveAlias('cmd_with_underscore', specialAliases)).toBe('command with underscore');
      expect(resolveAlias('cmd.with.dot', specialAliases)).toBe('command with dot');
    });
  });

  describe('reconstructCommand', () => {
    it('should reconstruct command with resolved alias and arguments', () => {
      expect(reconstructCommand('help', ['--verbose'], mockAliases))
        .toBe('show help --verbose');
      
      expect(reconstructCommand('greet', ['hello', 'world'], mockAliases))
        .toBe('send greeting hello world');
    });

    it('should handle empty arguments array', () => {
      expect(reconstructCommand('help', [], mockAliases)).toBe('show help ');
      expect(reconstructCommand('unknown', [], mockAliases)).toBe('unknown ');
    });

    it('should handle single argument', () => {
      expect(reconstructCommand('status', ['--json'], mockAliases))
        .toBe('get system status --json');
    });

    it('should handle multiple arguments', () => {
      expect(reconstructCommand('restart', ['--force', '--quiet', 'service1'], mockAliases))
        .toBe('restart service --force --quiet service1');
    });

    it('should handle arguments with special characters', () => {
      expect(reconstructCommand('greet', ['"Hello World"', '--flag=value'], mockAliases))
        .toBe('send greeting "Hello World" --flag=value');
    });

    it('should handle arguments with spaces', () => {
      expect(reconstructCommand('help', ['arg with spaces'], mockAliases))
        .toBe('show help arg with spaces');
    });

    it('should handle empty alias with arguments', () => {
      expect(reconstructCommand('', ['arg1', 'arg2'], mockAliases)).toBe(' arg1 arg2');
    });

    it('should handle empty alias and empty arguments', () => {
      expect(reconstructCommand('', [], mockAliases)).toBe(' ');
    });
  });

  describe('getAliasDescription', () => {
    it('should return description for existing aliases', () => {
      expect(getAliasDescription('help', mockAliases))
        .toBe('Display help information');
      
      expect(getAliasDescription('greet', mockAliases))
        .toBe('Send a greeting message');
      
      expect(getAliasDescription('status', mockAliases))
        .toBe('Check system status');
    });

    it('should return default message for non-existent aliases', () => {
      expect(getAliasDescription('unknown', mockAliases))
        .toBe('No description available');
      
      expect(getAliasDescription('nonexistent', mockAliases))
        .toBe('No description available');
    });

    it('should handle empty alias string', () => {
      expect(getAliasDescription('', mockAliases)).toBe('No description available');
    });

    it('should handle empty aliases mapping', () => {
      expect(getAliasDescription('help', {})).toBe('No description available');
    });

    it('should handle case-sensitive alias matching', () => {
      expect(getAliasDescription('HELP', mockAliases))
        .toBe('No description available');
    });

    it('should handle aliases with empty descriptions', () => {
      const emptyDescAliases = {
        'test': { command: 'test command', description: '' }
      };
      
      expect(getAliasDescription('test', emptyDescAliases)).toBe('No description available');
    });
  });

  describe('listAliases', () => {
    it('should return all alias keys as array', () => {
      const aliases = listAliases(mockAliases);
      
      expect(aliases).toEqual(expect.arrayContaining(['help', 'h', 'greet', 'status', 'restart']));
      expect(aliases).toHaveLength(5);
    });

    it('should return empty array for empty aliases mapping', () => {
      expect(listAliases({})).toEqual([]);
    });

    it('should return single alias for single entry', () => {
      const singleAlias = { 'test': { command: 'test cmd', description: 'test desc' } };
      expect(listAliases(singleAlias)).toEqual(['test']);
    });

    it('should handle aliases with special characters in keys', () => {
      const specialAliases = {
        'cmd-with-dash': { command: 'test', description: 'test' },
        'cmd_with_underscore': { command: 'test', description: 'test' },
        '123numeric': { command: 'test', description: 'test' }
      };
      
      const aliases = listAliases(specialAliases);
      expect(aliases).toEqual(expect.arrayContaining(['cmd-with-dash', 'cmd_with_underscore', '123numeric']));
      expect(aliases).toHaveLength(3);
    });

    it('should preserve the order of keys as defined', () => {
      const orderedAliases = {
        'z': { command: 'z', description: 'z' },
        'a': { command: 'a', description: 'a' },
        'm': { command: 'm', description: 'm' }
      };
      
      const aliases = listAliases(orderedAliases);
      expect(aliases).toEqual(['z', 'a', 'm']);
    });
  });

  describe('integration scenarios', () => {
    it('should work together to provide complete alias functionality', () => {
      // Test a complete workflow
      const alias = 'h';
      const args = ['--detailed'];
      
      // Step 1: Check if alias exists
      const aliases = listAliases(mockAliases);
      expect(aliases).toContain('h');
      
      // Step 2: Get description
      const description = getAliasDescription('h', mockAliases);
      expect(description).toBe('Display help information (short)');
      
      // Step 3: Resolve alias
      const resolved = resolveAlias(alias, mockAliases);
      expect(resolved).toBe('show help');
      
      // Step 4: Reconstruct full command
      const fullCommand = reconstructCommand(alias, args, mockAliases);
      expect(fullCommand).toBe('show help --detailed');
    });

    it('should handle complex alias mappings with overlapping commands', () => {
      const complexAliases = {
        'start': { command: 'service start', description: 'Start service' },
        'stop': { command: 'service stop', description: 'Stop service' },
        'restart': { command: 'service restart', description: 'Restart service' },
        'svc': { command: 'service', description: 'Service management' }
      };
      
      expect(resolveAlias('start', complexAliases)).toBe('service start');
      expect(resolveAlias('svc', complexAliases)).toBe('service');
      expect(reconstructCommand('start', ['--force'], complexAliases))
        .toBe('service start --force');
    });

    it('should handle unicode and special characters in aliases', () => {
      const unicodeAliases = {
        'hola': { command: 'greet spanish', description: 'Spanish greeting' },
        '你好': { command: 'greet chinese', description: 'Chinese greeting' },
        '😊': { command: 'send smile', description: 'Send smile emoji' }
      };
      
      expect(resolveAlias('hola', unicodeAliases)).toBe('greet spanish');
      expect(resolveAlias('你好', unicodeAliases)).toBe('greet chinese');
      expect(resolveAlias('😊', unicodeAliases)).toBe('send smile');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle very large alias mappings', () => {
      const largeAliases: AliasMapping = {};
      for (let i = 0; i < 1000; i++) {
        largeAliases[`alias${i}`] = {
          command: `command${i}`,
          description: `Description for alias ${i}`
        };
      }
      
      const aliases = listAliases(largeAliases);
      expect(aliases).toHaveLength(1000);
      expect(aliases).toContain('alias500');
      
      expect(resolveAlias('alias500', largeAliases)).toBe('command500');
      expect(getAliasDescription('alias500', largeAliases)).toBe('Description for alias 500');
    });

    it('should handle aliases with very long strings', () => {
      const longString = 'a'.repeat(1000);
      const longAliases = {
        [longString]: {
          command: longString + '_command',
          description: longString + '_description'
        }
      };
      
      expect(resolveAlias(longString, longAliases)).toBe(longString + '_command');
      expect(getAliasDescription(longString, longAliases)).toBe(longString + '_description');
    });
  });
});