// tests/handlers/commandHandler.test.js

const { commandHandler } = require('../../src/handlers/commandHandler');

// Define mock functions
function mockData() {
  return {
    name: 'flowise',
    description: 'Sends a query to the Flowise API. Usage: !flowise:[action] [query]'
  };
}

function mockExecute() {
  // Define mock implementation or leave empty if not needed
}

jest.mock('../../src/commands/flowise', () => ({
  data: mockData(),
  execute: jest.fn()
}));

describe('commandHandler Tests', () => {
    const mockExecute = require('../../src/commands/flowise').execute;

    beforeEach(() => {
        mockExecute.mockClear();
    });

    test('correctly handles flowise command with action and query', async () => {
        const mockMessage = {
            content: '!flowise:pinecone blue and black?',
            reply: jest.fn()
        };

        // Call the command handler
        await commandHandler(mockMessage, mockMessage.content);

        // The 'execute' function should be called with the correct arguments
        expect(mockExecute).toHaveBeenCalledWith(mockMessage, 'pinecone', 'blue and black?');
    });

    // Add more tests as needed...
});
