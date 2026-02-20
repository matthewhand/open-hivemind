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
  Alias,
  AliasMapping,
  getAliasDescription,
  listAliases,
  reconstructCommand,
  resolveAlias,
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
      help: { command: 'show help', description: 'Display help information' },
      h: { command: 'show help', description: 'Display help information (short)' },
      greet: { command: 'send greeting', description: 'Send a greeting message' },
      status: { command: 'get system status', description: 'Check system status' },
      restart: { command: 'restart service', description: 'Restart the bot service' },
    };
  });

  describe('basic alias operations', () => {
    it('should handle basic alias operations', () => {
      // resolveAlias
      expect(resolveAlias('help', mockAliases)).toBe('show help');
      expect(resolveAlias('unknown', mockAliases)).toBe('unknown');

      // reconstructCommand
      expect(reconstructCommand('help', ['--verbose'], mockAliases)).toBe('show help --verbose');
      expect(reconstructCommand('unknown', [], mockAliases)).toBe('unknown ');

      // getAliasDescription
      expect(getAliasDescription('help', mockAliases)).toBe('Display help information');
      expect(getAliasDescription('unknown', mockAliases)).toBe('No description available');

      // listAliases
      const aliases = listAliases(mockAliases);
      expect(aliases).toEqual(expect.arrayContaining(['help', 'h', 'greet', 'status', 'restart']));
      expect(aliases).toHaveLength(5);
    });
  });

  describe('complex scenarios and edge cases', () => {
    it('should handle complex scenarios and edge cases', () => {
      // Integration scenarios: Complete workflow
      const alias = 'h';
      const args = ['--detailed'];

      const aliases = listAliases(mockAliases);
      expect(aliases).toContain('h');

      const description = getAliasDescription('h', mockAliases);
      expect(description).toBe('Display help information (short)');

      const resolved = resolveAlias(alias, mockAliases);
      expect(resolved).toBe('show help');

      const fullCommand = reconstructCommand(alias, args, mockAliases);
      expect(fullCommand).toBe('show help --detailed');

      // Complex mappings
      const complexAliases = {
        start: { command: 'service start', description: 'Start service' },
        stop: { command: 'service stop', description: 'Stop service' },
        restart: { command: 'service restart', description: 'Restart service' },
        svc: { command: 'service', description: 'Service management' },
      };

      expect(resolveAlias('start', complexAliases)).toBe('service start');
      expect(reconstructCommand('start', ['--force'], complexAliases)).toBe(
        'service start --force'
      );

      // Unicode and special characters
      const unicodeAliases = {
        hola: { command: 'greet spanish', description: 'Spanish greeting' },
        你好: { command: 'greet chinese', description: 'Chinese greeting' },
        '😊': { command: 'send smile', description: 'Send smile emoji' },
      };

      expect(resolveAlias('hola', unicodeAliases)).toBe('greet spanish');
      expect(resolveAlias('你好', unicodeAliases)).toBe('greet chinese');
      expect(resolveAlias('😊', unicodeAliases)).toBe('send smile');

      // Edge cases: Large mappings
      const largeAliases: AliasMapping = {};
      for (let i = 0; i < 100; i++) {
        // Reduced from 1000 to 100 for test speed
        largeAliases[`alias${i}`] = {
          command: `command${i}`,
          description: `Description for alias ${i}`,
        };
      }

      const aliases2 = listAliases(largeAliases);
      expect(aliases2).toHaveLength(100);
      expect(aliases2).toContain('alias50');

      expect(resolveAlias('alias50', largeAliases)).toBe('command50');
      expect(getAliasDescription('alias50', largeAliases)).toBe('Description for alias 50');

      // Long strings
      const longString = 'a'.repeat(100); // Reduced from 1000 to 100
      const longAliases = {
        [longString]: {
          command: longString + '_command',
          description: longString + '_description',
        },
      };

      expect(resolveAlias(longString, longAliases)).toBe(longString + '_command');
      expect(getAliasDescription(longString, longAliases)).toBe(longString + '_description');
    });
  });
});
