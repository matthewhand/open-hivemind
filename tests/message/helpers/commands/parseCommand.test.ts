// Mock debug module properly
jest.mock('debug', () => {
  const mockDebug = jest.fn();
  return jest.fn(() => mockDebug);
});

import { parseCommand } from '@message/helpers/commands/parseCommand';

// Get the mock debug function for assertions
const Debug = require('debug');
const mockDebug = Debug('app:parseCommand');

describe('parseCommand', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('Basic command parsing', () => {
        it('should return null for empty command content', () => {
            const result = parseCommand('');
            expect(result).toBeNull();
        });

        it('should return null for whitespace-only content', () => {
            const result = parseCommand('   ');
            expect(result).toBeNull();
        });

        it('should return null for non-command text', () => {
            const result = parseCommand('Hello World');
            expect(result).toBeNull();
        });

        it('should return null for text starting with exclamation but not a command', () => {
            const result = parseCommand('!');
            expect(result).toBeNull();
        });

        it('should parse simple command name correctly', () => {
            const result = parseCommand('!start');
            expect(result).toEqual({
                commandName: 'start',
                action: '',
                args: []
            });
        });

        it('should parse command name with action correctly', () => {
            const result = parseCommand('!start:now');
            expect(result).toEqual({
                commandName: 'start',
                action: 'now',
                args: []
            });
        });

        it('should parse command name, action, and single argument correctly', () => {
            const result = parseCommand('!start:now quickly');
            expect(result).toEqual({
                commandName: 'start',
                action: 'now',
                args: ['quickly']
            });
        });

        it('should handle multiple arguments', () => {
            const result = parseCommand('!deploy:prod server1 server2 --force');
            expect(result).toEqual({
                commandName: 'deploy',
                action: 'prod',
                args: ['server1', 'server2', '--force']
            });
        });
    });

    describe('Command prefix handling', () => {
        it('should handle commands without exclamation mark', () => {
            const result = parseCommand('help');
            expect(result).toBeNull();
        });

        it('should require exclamation mark at the beginning', () => {
            const result = parseCommand('start!');
            expect(result).toBeNull();
        });

        it('should handle exclamation mark in the middle of text', () => {
            const result = parseCommand('hello !start world');
            expect(result).toBeNull();
        });

        it('should handle multiple exclamation marks', () => {
            const result = parseCommand('!!start');
            expect(result).toBeNull();
        });
    });

    describe('Whitespace handling', () => {
        it('should handle leading whitespace', () => {
            const result = parseCommand('  !status  ');
            expect(result?.commandName).toBe('status');
            expect(result?.action).toBe('');
            expect(result?.args).toEqual([]);
        });

        it('should handle trailing whitespace', () => {
            const result = parseCommand('!status   ');
            expect(result?.commandName).toBe('status');
        });

        it('should handle multiple spaces between arguments', () => {
            const result = parseCommand('!deploy:prod   server1    server2     --force');
            expect(result).toEqual({
                commandName: 'deploy',
                action: 'prod',
                args: ['server1', 'server2', '--force']
            });
        });

        it('should handle tabs and mixed whitespace', () => {
            const result = parseCommand('!start:now\tquickly   fast');
            expect(result).toEqual({
                commandName: 'start',
                action: 'now',
                args: ['quickly', 'fast']
            });
        });
    });

    describe('Action parsing', () => {
        it('should handle empty action after colon', () => {
            const result = parseCommand('!start:');
            expect(result).toEqual({
                commandName: 'start',
                action: '',
                args: [':']
            });
        });

        it('should only capture first action part (regex limitation)', () => {
            const result = parseCommand('!config:set:debug true');
            expect(result).toEqual({
                commandName: 'config',
                action: 'set',
                args: [':debug', 'true']
            });
        });

        it('should only capture word characters in actions', () => {
            const result = parseCommand('!deploy:prod-v2.1');
            expect(result).toEqual({
                commandName: 'deploy',
                action: 'prod',
                args: ['-v2.1']
            });
        });

        it('should handle numeric actions', () => {
            const result = parseCommand('!version:123');
            expect(result).toEqual({
                commandName: 'version',
                action: '123',
                args: []
            });
        });
    });

    describe('Argument parsing', () => {
        it('should handle quoted arguments', () => {
            const result = parseCommand('!echo "hello world" test');
            expect(result).toEqual({
                commandName: 'echo',
                action: '',
                args: ['"hello', 'world"', 'test']
            });
        });

        it('should handle arguments with special characters', () => {
            const result = parseCommand('!config:set api_key=abc123!@#');
            expect(result).toEqual({
                commandName: 'config',
                action: 'set',
                args: ['api_key=abc123!@#']
            });
        });

        it('should handle empty arguments', () => {
            const result = parseCommand('!test "" empty');
            expect(result).toEqual({
                commandName: 'test',
                action: '',
                args: ['""', 'empty']
            });
        });

        it('should handle numeric arguments', () => {
            const result = parseCommand('!scale:up 5 10.5 -3');
            expect(result).toEqual({
                commandName: 'scale',
                action: 'up',
                args: ['5', '10.5', '-3']
            });
        });

        it('should handle boolean-like arguments', () => {
            const result = parseCommand('!feature:toggle true false yes no');
            expect(result).toEqual({
                commandName: 'feature',
                action: 'toggle',
                args: ['true', 'false', 'yes', 'no']
            });
        });
    });

    describe('Case sensitivity', () => {
        it('should convert command name to lowercase', () => {
            const result = parseCommand('!Start');
            expect(result?.commandName).toBe('start');
        });

        it('should preserve action case', () => {
            const result = parseCommand('!deploy:PROD');
            expect(result?.action).toBe('PROD');
        });

        it('should preserve argument case', () => {
            const result = parseCommand('!echo Hello WORLD');
            expect(result?.args).toEqual(['Hello', 'WORLD']);
        });
    });

    describe('Complex command scenarios', () => {
        it('should handle very long commands', () => {
            const longCommand = '!deploy:production ' + 'arg'.repeat(100);
            const result = parseCommand(longCommand);
            expect(result?.commandName).toBe('deploy');
            expect(result?.action).toBe('production');
            expect(result?.args).toHaveLength(1);
        });

        it('should handle commands with URLs', () => {
            const result = parseCommand('!webhook:add https://example.com/hook?token=abc123');
            expect(result).toEqual({
                commandName: 'webhook',
                action: 'add',
                args: ['https://example.com/hook?token=abc123']
            });
        });

        it('should handle commands with file paths', () => {
            const result = parseCommand('!load:config /path/to/config.json ./relative/path');
            expect(result).toEqual({
                commandName: 'load',
                action: 'config',
                args: ['/path/to/config.json', './relative/path']
            });
        });

        it('should handle commands with JSON-like arguments', () => {
            const result = parseCommand('!config:set {"key":"value","number":42}');
            expect(result).toEqual({
                commandName: 'config',
                action: 'set',
                args: ['{"key":"value","number":42}']
            });
        });
    });

    describe('Edge cases and error handling', () => {
        it('should handle null input', () => {
            const result = parseCommand(null as any);
            expect(result).toBeNull();
        });

        it('should handle undefined input', () => {
            const result = parseCommand(undefined as any);
            expect(result).toBeNull();
        });

        it('should handle non-string input', () => {
            const result = parseCommand(123 as any);
            expect(result).toBeNull();
        });

        it('should handle object input', () => {
            const result = parseCommand({} as any);
            expect(result).toBeNull();
        });

        it('should handle array input', () => {
            const result = parseCommand([] as any);
            expect(result).toBeNull();
        });

        it('should return null for commands with non-word characters', () => {
            const result = parseCommand('!@#$%^&*()');
            expect(result).toBeNull();
        });

        it('should return null for unicode characters in command names (regex limitation)', () => {
            const result = parseCommand('!测试:动作 参数1 参数2');
            expect(result).toBeNull();
        });

        it('should return null for emoji in command names (regex limitation)', () => {
            const result = parseCommand('!🚀:deploy 🎯 target');
            expect(result).toBeNull();
        });
    });

    describe('Return value structure', () => {
        it('should always return consistent structure when successful', () => {
            const result = parseCommand('!test');
            expect(result).toHaveProperty('commandName');
            expect(result).toHaveProperty('action');
            expect(result).toHaveProperty('args');
            expect(Array.isArray(result?.args)).toBe(true);
        });

        it('should return null for invalid commands', () => {
            const invalidCommands = [
                '',
                '   ',
                'not a command',
                '!',
                null,
                undefined,
                123,
                {}
            ];

            invalidCommands.forEach(cmd => {
                const result = parseCommand(cmd as any);
                expect(result).toBeNull();
            });
        });

        it('should ensure args is always an array', () => {
            const commands = [
                '!simple',
                '!with:action',
                '!with:action arg1',
                '!with:action arg1 arg2 arg3'
            ];

            commands.forEach(cmd => {
                const result = parseCommand(cmd);
                expect(Array.isArray(result?.args)).toBe(true);
            });
        });
    });

    describe('Debug Logging', () => {
        it('should log when command content is null or undefined', () => {
            parseCommand(null as any);
            expect(mockDebug).toHaveBeenCalledWith('Command content is null or undefined.');
            
            parseCommand(undefined as any);
            expect(mockDebug).toHaveBeenCalledWith('Command content is null or undefined.');
        });

        it('should log when content is not a command', () => {
            parseCommand('hello world');
            expect(mockDebug).toHaveBeenCalledWith('Not a command message.');
            
            parseCommand('   ');
            expect(mockDebug).toHaveBeenCalledWith('Not a command message.');
        });

        it('should log successful command parsing', () => {
            parseCommand('!test:action arg1 arg2');
            expect(mockDebug).toHaveBeenCalledWith('Attempting to parse command content: !test:action arg1 arg2');
            expect(mockDebug).toHaveBeenCalledWith('Parsed command - Name: test  Action: action, Args: arg1 arg2');
        });

        it('should log when command does not match pattern', () => {
            parseCommand('!@invalid');
            expect(mockDebug).toHaveBeenCalledWith('Attempting to parse command content: !@invalid');
            expect(mockDebug).toHaveBeenCalledWith('Command content did not match expected pattern.');
        });
    });

    describe('Regex Pattern Validation', () => {
        it('should only accept word characters in command names', () => {
            const validCommands = ['!test', '!test123', '!test_command', '!TEST', '!123command'];
            const invalidCommands = ['!@command', '!.command', '!-command'];
            
            validCommands.forEach(cmd => {
                const result = parseCommand(cmd);
                expect(result).not.toBeNull();
            });
            
            invalidCommands.forEach(cmd => {
                const result = parseCommand(cmd);
                expect(result).toBeNull();
            });
        });

        it('should only accept word characters in action names', () => {
            expect(parseCommand('!test:action123')).not.toBeNull();
            expect(parseCommand('!test:action_name')).not.toBeNull();
            expect(parseCommand('!test:ACTION')).not.toBeNull();
            
            // These should parse but action will be truncated at non-word characters
            const result1 = parseCommand('!test:action-name');
            expect(result1?.action).toBe('action');
            expect(result1?.args).toEqual(['-name']);
            
            const result2 = parseCommand('!test:action.name');
            expect(result2?.action).toBe('action');
            expect(result2?.args).toEqual(['.name']);
        });

        it('should handle command names starting with numbers (valid in regex)', () => {
            expect(parseCommand('!123command')).not.toBeNull();
            expect(parseCommand('!1test')).not.toBeNull();
        });

        it('should handle empty command after exclamation', () => {
            expect(parseCommand('!')).toBeNull();
            expect(parseCommand('! ')).toBeNull();
            expect(parseCommand('!:')).toBeNull();
        });
    });

    describe('Boundary Testing', () => {
        it('should handle maximum realistic command lengths', () => {
            const maxCommand = '!command:action ' + 'a'.repeat(10000);
            const result = parseCommand(maxCommand);
            expect(result?.commandName).toBe('command');
            expect(result?.action).toBe('action');
            expect(result?.args).toHaveLength(1);
            expect(result?.args[0]).toHaveLength(10000);
        });

        it('should handle commands with many arguments', () => {
            const manyArgs = Array(1000).fill(0).map((_, i) => `arg${i}`).join(' ');
            const result = parseCommand(`!test:action ${manyArgs}`);
            expect(result?.args).toHaveLength(1000);
            expect(result?.args[0]).toBe('arg0');
            expect(result?.args[999]).toBe('arg999');
        });

        it('should handle single character commands and actions', () => {
            const result = parseCommand('!a:b c');
            expect(result).toEqual({
                commandName: 'a',
                action: 'b',
                args: ['c']
            });
        });
    });

    describe('Type Safety and Robustness', () => {
        it('should handle various falsy values', () => {
            const falsyValues = [null, undefined, '', 0, false, NaN];
            falsyValues.forEach(value => {
                const result = parseCommand(value as any);
                expect(result).toBeNull();
            });
        });

        it('should handle non-string types gracefully', () => {
            const nonStringValues = [
                123, 
                true, 
                false, 
                {}, 
                [], 
                new Date(), 
                /regex/, 
                Symbol('test'),
                () => {}
            ];
            
            nonStringValues.forEach(value => {
                expect(() => {
                    const result = parseCommand(value as any);
                    expect(result).toBeNull();
                }).not.toThrow();
            });
        });

        it('should maintain immutability of input', () => {
            const input = '!test:action arg1 arg2';
            const originalInput = input;
            parseCommand(input);
            expect(input).toBe(originalInput);
        });
    });

    describe('Real-world Command Scenarios', () => {
        it('should handle common bot commands', () => {
            const commonCommands = [
                { input: '!help', expected: { commandName: 'help', action: '', args: [] } },
                { input: '!status', expected: { commandName: 'status', action: '', args: [] } },
                { input: '!ping', expected: { commandName: 'ping', action: '', args: [] } },
                { input: '!version', expected: { commandName: 'version', action: '', args: [] } },
                { input: '!restart:now', expected: { commandName: 'restart', action: 'now', args: [] } },
                { input: '!deploy:production --force', expected: { commandName: 'deploy', action: 'production', args: ['--force'] } }
            ];
            
            commonCommands.forEach(({ input, expected }) => {
                const result = parseCommand(input);
                expect(result).toEqual(expected);
            });
        });

        it('should handle configuration commands', () => {
            const configCommands = [
                '!config:get database_url',
                '!config:set debug true',
                '!config:list',
                '!config:reset all'
            ];
            
            configCommands.forEach(cmd => {
                const result = parseCommand(cmd);
                expect(result?.commandName).toBe('config');
                expect(result?.action).toMatch(/^(get|set|list|reset)$/);
            });
        });

        it('should handle system administration commands', () => {
            const adminCommands = [
                { cmd: '!user:add john.doe@example.com admin', name: 'user', action: 'add' },
                { cmd: '!role:assign moderator @user123', name: 'role', action: 'assign' },
                { cmd: '!ban:user spammer123 spam', name: 'ban', action: 'user' },
                { cmd: '!channel:create general public', name: 'channel', action: 'create' }
            ];
            
            adminCommands.forEach(({ cmd, name, action }) => {
                const result = parseCommand(cmd);
                expect(result?.commandName).toBe(name);
                expect(result?.action).toBe(action);
                expect(result?.args.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Performance', () => {
        it('should handle many command parsing operations efficiently', () => {
            const startTime = Date.now();
            
            for (let i = 0; i < 1000; i++) {
                parseCommand(`!command${i}:action${i} arg1 arg2 arg3`);
            }
            
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(1000); // Should complete 1000 operations in under 1 second
        });

        it('should handle very long command strings efficiently', () => {
            const longArgs = Array(1000).fill('arg').join(' ');
            const longCommand = `!test:action ${longArgs}`;
            
            const startTime = Date.now();
            const result = parseCommand(longCommand);
            const duration = Date.now() - startTime;
            
            expect(result?.commandName).toBe('test');
            expect(result?.args).toHaveLength(1000);
            expect(duration).toBeLessThan(100); // Should complete quickly even with long input
        });

        it('should have consistent performance across different input types', () => {
            const testCases = [
                '!simple',
                '!complex:action with many arguments here',
                '!invalid@command',
                'not a command at all',
                '',
                null
            ];
            
            const times: number[] = [];
            
            testCases.forEach(testCase => {
                const start = performance.now();
                parseCommand(testCase as any);
                const end = performance.now();
                times.push(end - start);
            });
            
            // All operations should complete in reasonable time
            times.forEach(time => {
                expect(time).toBeLessThan(10); // Less than 10ms each
            });
        });
    });

    describe('Memory and Resource Management', () => {
        it('should not leak memory with repeated parsing', () => {
            // This test ensures no memory leaks in the parsing logic
            const initialMemory = process.memoryUsage().heapUsed;
            
            for (let i = 0; i < 10000; i++) {
                parseCommand(`!test${i}:action${i} arg1 arg2`);
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be reasonable (less than 10MB)
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
        });

        it('should handle concurrent-like parsing operations', () => {
            const promises = Array(100).fill(0).map((_, i) => 
                Promise.resolve(parseCommand(`!concurrent${i}:test arg${i}`))
            );
            
            return Promise.all(promises).then(results => {
                results.forEach((result, i) => {
                    expect(result?.commandName).toBe(`concurrent${i}`);
                    expect(result?.action).toBe('test');
                    expect(result?.args).toEqual([`arg${i}`]);
                });
            });
        });
    });
});