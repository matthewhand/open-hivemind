const { commandHandler, parseCommand } = require('../../src/handlers/commandHandler');

describe('commandHandler Tests', () => {
    test('flowise command is loaded and exists', () => {
        const commands = require('../../src/commands/inline');
        if (!commands['flowise']) {
            console.debug('Available commands:', Object.keys(commands));
        }
        expect(commands['flowise']).toBeDefined();
    });

    test('parses command into name, action, and args', () => {
        const mockMessage = { content: '!flowise:pinecone blue and black?', reply: jest.fn() };
        const parsedCommand = parseCommand(mockMessage.content);
        expect(parsedCommand).toEqual({ commandName: 'flowise', action: 'pinecone', args: 'blue and black?' });
    });

    // test('resolves aliases to correct commands', () => {
    //     const aliases = require('../../src/config/aliases');
    //     expect(aliases['flowiseAlias']).toBe('flowise');
    // });

    // Add more tests as needed...
});
