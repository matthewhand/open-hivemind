const commandParser = require('../../src/message/helpers/commands/commandParser');

describe('Command Parser', () => {
    describe('Valid command parsing', () => {
        test('parses a command without arguments', () => {
            const input = '!hello';
            const result = commandParser.parse(input);
            expect(result).not.toBeNull();
            expect(result.command).toBe('hello');
            expect(result.args).toEqual([]);
        });

        test('parses a command with single argument', () => {
            const input = '!status';
            const result = commandParser.parse(input);
            expect(result.command).toBe('status');
            expect(result.args).toEqual([]);
        });

        test('parses a command with multiple arguments', () => {
            const input = '!greet John Doe';
            const result = commandParser.parse(input);
            expect(result.command).toBe('greet');
            expect(result.args).toEqual(['John', 'Doe']);
        });

        test('parses a command with quoted arguments', () => {
            const input = '!say "Hello World"';
            const result = commandParser.parse(input);
            expect(result.command).toBe('say');
            expect(result.args).toEqual(['"Hello', 'World"']);
        });

        test('handles multiple spaces between arguments', () => {
            const input = '!move   left   right';
            const result = commandParser.parse(input);
            expect(result.command).toBe('move');
            expect(result.args).toEqual(['left', 'right']);
        });
    });

    describe('Invalid input handling', () => {
        test('returns null for message without exclamation prefix', () => {
            const input = 'hello';
            const result = commandParser.parse(input);
            expect(result).toBeNull();
        });

        test('returns null for empty string', () => {
            const input = '';
            const result = commandParser.parse(input);
            expect(result).toBeNull();
        });

        test('returns null for whitespace only', () => {
            const input = '   ';
            const result = commandParser.parse(input);
            expect(result).toBeNull();
        });

        test('returns null for just exclamation mark', () => {
            const input = '!';
            const result = commandParser.parse(input);
            expect(result).toBeNull();
        });

        test('returns null for exclamation mark with only spaces', () => {
            const input = '!   ';
            const result = commandParser.parse(input);
            expect(result).toBeNull();
        });
    });

    describe('Edge cases', () => {
        test('handles commands with numbers', () => {
            const input = '!play123';
            const result = commandParser.parse(input);
            expect(result.command).toBe('play123');
            expect(result.args).toEqual([]);
        });

        test('handles commands with underscores', () => {
            const input = '!get_user_info';
            const result = commandParser.parse(input);
            expect(result.command).toBe('get_user_info');
            expect(result.args).toEqual([]);
        });

        test('handles commands with hyphens', () => {
            const input = '!start-process';
            const result = commandParser.parse(input);
            expect(result.command).toBe('start-process');
            expect(result.args).toEqual([]);
        });

        test('preserves case sensitivity', () => {
            const input = '!Hello';
            const result = commandParser.parse(input);
            expect(result.command).toBe('Hello');
        });

        test('handles very long commands', () => {
            const longCommand = 'a'.repeat(100);
            const input = `!${longCommand}`;
            const result = commandParser.parse(input);
            expect(result.command).toBe(longCommand);
        });
    });

    describe('Return value structure', () => {
        test('returns object with command and args properties', () => {
            const input = '!test arg1 arg2';
            const result = commandParser.parse(input);
            expect(result).toHaveProperty('command');
            expect(result).toHaveProperty('args');
            expect(Array.isArray(result.args)).toBe(true);
        });

        test('ensures args is always an array', () => {
            const input = '!solo';
            const result = commandParser.parse(input);
            expect(Array.isArray(result.args)).toBe(true);
            expect(result.args).toEqual([]);
        });
    });
});
