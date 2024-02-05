const { commandHandler, parseCommand } = require('../../src/handlers/commandHandler');
const mockCommands = require('../../src/commands/inline');

jest.mock('../../src/commands/inline', () => ({
    oai: { execute: jest.fn() },
    flowise: { execute: jest.fn() }
    // Mock other commands as needed
}));

describe('commandHandler Tests', () => {
    // Tests for parsing commands
    test('parses command into name, action, and args', () => {
        const commandContent = '!flowise:action args';
        expect(parseCommand(commandContent)).toEqual({
            commandName: 'flowise',
            action: 'action',
            args: 'args'
        });
    });

    // Tests for handling specific commands
    test('handles oai command execution', async () => {
        const mockMessage = { content: '!oai test query', reply: jest.fn() };
        await commandHandler(mockMessage, mockMessage.content);
        expect(mockCommands.oai.execute).toHaveBeenCalledWith(mockMessage, '', 'test query');
    });

    // Add more tests as needed...
});
