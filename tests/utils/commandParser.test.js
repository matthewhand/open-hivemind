const { parseCommand } = require('../../src/utils/commandParser');
const logger = require('../../src/utils/logger');

// Mock the logger to prevent actual logging during tests
jest.mock('../../src/utils/logger', () => ({
    debug: jest.fn(),
}));

describe('parseCommand', () => {
    test('parses command with action and args', () => {
        const result = parseCommand('!command:action arg1 arg2');
        expect(result).toEqual({
            commandName: 'command',
            action: 'action',
            args: 'arg1 arg2'
        });
    });

    test('parses command with args but no action', () => {
        const result = parseCommand('!command arg1 arg2');
        expect(result).toEqual({
            commandName: 'command',
            action: '',
            args: 'arg1 arg2'
        });
    });

    test('parses command with mention in args', () => {
        const result = parseCommand('!command <@12345> some more args');
        expect(result).toEqual({
            commandName: 'command',
            action: '',
            args: '<@12345> some more args'
        });
    });

    test('returns null for invalid command format', () => {
        const result = parseCommand('Not a command');
        expect(result).toBeNull();
    });

    // Add more test cases as needed
});
