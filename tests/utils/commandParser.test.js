const { parseCommand } = require('../../src/utils/commandParser');
const logger = require('../../src/utils/logger');

// // Mock the logger to prevent actual logging during tests
// jest.mock('../../src/utils/logger', () => ({
//     debug: jest.fn(),
// }));

describe('parseCommand', () => {

    // test('parses basic command without arguments', () => {
    //     const commandContent = '!help';
    //     const result = parseCommand(commandContent);
    //     console.log(result); // This will output to the test run console
    //     expect(result.commandName).toEqual('help');
    // });

    test('parses command with multiple arguments', () => {
        const commandContent = '!ban user123 for breaking rules';
        expect(parseCommand(commandContent)).toEqual({
            commandName: 'ban',
            action: '',
            args: 'user123 for breaking rules'
        });
    });
    
    test('parses command with action and arguments', () => {
        const commandContent = '!user:add user123 admin';
        expect(parseCommand(commandContent)).toEqual({
            commandName: 'user',
            action: 'add',
            args: 'user123 admin'
        });
    });
    test('parses command with special characters in arguments', () => {
        const commandContent = '!message @user123 👋 Hello!';
        expect(parseCommand(commandContent)).toEqual({
            commandName: 'message',
            action: '',
            args: '@user123 👋 Hello!'
        });
    });

    test('parses command with empty or whitespace arguments', () => {
        const commandContent = '!command   ';
        expect(parseCommand(commandContent)).toEqual({
            commandName: 'command',
            action: '',
            args: ''
        });
    });

    test('parses complex command structures', () => {
        const commandContent = '!config:set key:value';
        expect(parseCommand(commandContent)).toEqual({
            commandName: 'config',
            action: 'set',
            args: 'key:value'
        });
    });
});
