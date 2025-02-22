const commandParser = require('../../src/message/helpers/commands/commandParser');

describe('Command Parser', () => {
    test('parses a command without arguments', () => {
        const input = '!hello';
        const result = commandParser.parse(input);
        expect(result.command).toBe('hello');
        expect(result.args).toEqual([]);
    });

    test('parses a command with arguments', () => {
        const input = '!greet John Doe';
        const result = commandParser.parse(input);
        expect(result.command).toBe('greet');
        expect(result.args).toEqual(['John', 'Doe']);
    });

    test('returns null for an invalid command', () => {
        const input = 'hello';
        const result = commandParser.parse(input);
        expect(result).toBeNull();
    });
});
