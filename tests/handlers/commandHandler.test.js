const { commandHandler } = require('../../src/handlers/commandHandler');
const oai = require('../../src/commands/inline/oai');
const flowise = require('../../src/commands/inline/flowise');

jest.mock('../../src/commands/inline/oai', () => ({
  execute: jest.fn().mockImplementation(() => Promise.resolve("OAI test response")),
}), { virtual: true });

jest.mock('../../src/commands/inline/flowise', () => ({
  execute: jest.fn().mockImplementation(() => Promise.resolve("Flowise test response")),
}), { virtual: true });

// Define the mock implementation directly within the jest.mock call
jest.mock('../../src/config/configurationManager', () => ({
  getConfig: jest.fn().mockImplementation((key) => {
    if (key === 'BOT_TO_BOT_MODE') return true; // or false depending on what you need for your test
    // Add more conditions as necessary
    return null;
  }),
}));

// Or, if you need to reference the mock in your tests (e.g., to change its implementation or assert calls),
// you can do so by accessing the mock functions via jest's mocking utilities:
// jest.requireMock or jest.mocked (for TypeScript users)

// Example test that uses the mocked getConfig:
describe('commandHandler Tests', () => {
  it('handles BOT_TO_BOT_MODE correctly', async () => {
    // Setup your test environment, including any necessary mock implementations
    // for commands or other dependencies

    // Example assertion (adjust according to your actual commandHandler logic)
    const mockMessage = { content: '!testCommand', reply: jest.fn() };
    await commandHandler(mockMessage);
    expect(mockMessage.reply).toHaveBeenCalled(); // or any other assertion relevant to your test case
  });
});
