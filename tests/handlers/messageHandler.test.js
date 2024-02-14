// tests/handlers/messageHandler.test.js
jest.mock('../../src/config/configurationManager', () => ({
  getConfig: jest.fn().mockReturnValue({}),
}));
jest.mock('../../src/managers/DiscordManager', () => {
  const mockSendResponse = jest.fn().mockResolvedValue(true);
  return {
    getInstance: jest.fn(() => ({
      sendResponse: mockSendResponse,
      fetchMessages: jest.fn().mockResolvedValue([]),
    })),
  };
});
jest.mock('../../src/managers/oaiApiManager', () => {
  return function() {
    return {
      sendRequest: jest.fn().mockResolvedValue({
        choices: [{ text: 'Mocked response' }],
      }),
      buildRequestBody: jest.fn().mockImplementation(() => ({
        model: "gpt-3.5-turbo",
        prompt: "Hello, world!",
        max_tokens: 100,
      })),
      requiresHistory: jest.fn().mockReturnValue(true),
    };
  };
});

const { messageHandler } = require('../../src/handlers/messageHandler');
const { getInstance } = require('../../src/managers/DiscordManager');

describe('messageHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ignores messages from bots', async () => {
    const botMessage = { author: { bot: true }, content: 'Beep boop', channel: { id: 'test-channel' } };
    await messageHandler(botMessage);
    expect(getInstance().sendResponse).not.toHaveBeenCalled();
  });

  test('responds to user messages', async () => {
    const userMessage = { author: { bot: false }, content: 'Hello, world!', channel: { id: 'test-channel' } };
    await messageHandler(userMessage);
    expect(getInstance().sendResponse).toHaveBeenCalledTimes(1);
    expect(getInstance().sendResponse).toHaveBeenCalledWith('test-channel', 'Mocked response');
  });

  test('handles errors gracefully', async () => {
    getInstance().sendResponse.mockRejectedValueOnce(new Error('Discord API error'));
    const userMessage = { author: { bot: false }, content: 'This should cause an error', channel: { id: 'test-channel' } };
    await messageHandler(userMessage);
    expect(getInstance().sendResponse).toHaveBeenCalledWith('test-channel', 'Sorry, I encountered an error.');
  });
});
