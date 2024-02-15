// Mock the DiscordMessage model
jest.mock('../../src/models/DiscordMessage', () => {
  return jest.fn().mockImplementation((message) => ({
    getText: () => message.content,
    getChannelId: () => message.channelId,
    getAuthorId: () => message.authorId,
    isFromBot: () => message.isBot || false,
  }));
});

// Mock the constants if necessary
jest.mock('../../src/config/constants', () => ({
  CLIENT_ID: '1234567890', // Example bot ID
  LLM_MODEL: "gpt-3.5-turbo",
  LLM_SYSTEM_PROMPT: "System prompt message",
  LLM_MAX_TOKENS: 150,
  LLM_TEMPERATURE: 0.7,
  LLM_TOP_P: 1,
  LLM_FREQUENCY_PENALTY: 0,
  LLM_PRESENCE_PENALTY: 0,
}));
const OpenAiManager = require('../../src/managers/OpenAiManager');
const DiscordMessage = require('../../src/models/DiscordMessage');

describe('OpenAiManager buildRequestBody', () => {
  let openAiManager;

  beforeEach(() => {
    openAiManager = new OpenAiManager();
  });

  test('correctly structures payload with mixed message history and system prompt', () => {
    // Prepare your mock messages
    const historyMessages = [
      new DiscordMessage({ content: 'Hello, how are you?', authorId: 'not-bot', channelId: '123', isBot: false }),
      new DiscordMessage({ content: 'I am fine, thank you!', authorId: 'not-bot', channelId: '123', isBot: false }),
    ];
    const userMessage = new DiscordMessage({ content: 'Can you tell me a joke?', authorId: 'not-bot', channelId: '123', isBot: false });

    // Expected payload structure
    const expectedPayload = {
      model: "gpt-3.5-turbo",
      messages: [
        { role: 'system', content: "System prompt message" },
        { role: 'user', content: 'Hello, how are you?' },
        { role: 'user', content: 'I am fine, thank you!' },
        { role: 'user', content: 'Can you tell me a joke?' },
      ],
      max_tokens: 150,
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    };

    // Call the method under test
    const result = openAiManager.buildRequestBody([...historyMessages, userMessage]);

    // Assertions
    expect(result).toEqual(expectedPayload);
  });

  // Add more tests as needed...
});
