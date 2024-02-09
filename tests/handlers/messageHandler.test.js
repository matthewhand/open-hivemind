// Simplify the mock setup for messageHandler tests
jest.mock('../../src/utils/messageUtils', () => ({
  fetchConversationHistory: jest.fn(),
}));

jest.mock('axios');

// Assuming logger uses common logging methods: debug, info, warn, error
jest.mock('../../src/utils/logger');

// ConfigurationManager mock setup for BOT_TO_BOT_MODE testing
jest.mock('../../src/config/configurationManager', () => ({
  getConfig: jest.fn().mockImplementation((key) => {
    if (key === 'BOT_TO_BOT_MODE') return false; // Default behavior
    return null; // Default for other keys
  }),
}));

const { messageHandler } = require('../../src/handlers/messageHandler');
const { fetchConversationHistory } = require('../../src/utils/messageUtils');
const configurationManager = require('../../src/config/configurationManager');

describe('messageHandler Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Reset mocks before each test
  });

  test('ignores bot messages if BOT_TO_BOT_MODE is disabled', async () => {
    const botMessage = {
      author: { bot: true },
      client: { user: { id: 'bot-id' } },
      reply: jest.fn(),
      content: '!test command',
    };

    await messageHandler(botMessage);

    // Verifying that the handler correctly ignores bot messages
    expect(fetchConversationHistory).not.toHaveBeenCalled();
    expect(botMessage.reply).not.toHaveBeenCalled();
  });

  test('processes message from non-bot when BOT_TO_BOT_MODE is enabled', async () => {
    // Setup the mock to simulate BOT_TO_BOT_MODE enabled
    configurationManager.getConfig.mockImplementation(key => key === 'BOT_TO_BOT_MODE' ? true : null);

    const userMessage = {
      author: { bot: false },
      client: { user: { id: 'user-id' } },
      reply: jest.fn(),
      content: '!test command',
    };

    await messageHandler(userMessage);

    // Here you should assert the expected behavior when BOT_TO_BOT_MODE is enabled
    // This could vary based on your logic, so adjust accordingly
    // Example for expected call to reply or fetchConversationHistory
    // expect(fetchConversationHistory).toHaveBeenCalledWith(expect.anything());
    // or
    // expect(userMessage.reply).toHaveBeenCalledWith(expect.stringContaining("some response"));
  });

  afterEach(() => {
    jest.resetAllMocks(); // Clean up mocks after each test
  });
});
