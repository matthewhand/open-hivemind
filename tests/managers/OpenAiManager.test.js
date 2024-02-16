// Import dependencies
const OpenAiManager = require('../../src/managers/OpenAiManager');

// Mocking dependencies
jest.mock('../../src/models/DiscordMessage');
jest.mock('../../src/config/constants', () => ({
  CLIENT_ID: '1234567890', // Example bot client ID for role differentiation
  LLM_MODEL: "gpt-3.5-turbo",
  LLM_SYSTEM_PROMPT: "You are a helpful assistant.",
  LLM_MAX_TOKENS: 150,
  LLM_TEMPERATURE: 0.7,
  LLM_TOP_P: 1,
  LLM_FREQUENCY_PENALTY: 0,
  LLM_PRESENCE_PENALTY: 0,
}));

// Mock implementation for DiscordMessage
const DiscordMessage = require('../../src/models/DiscordMessage');
DiscordMessage.mockImplementation((content, isBot = false) => ({
  getText: () => content,
  getChannelId: () => '1234567890',
  getAuthorId: () => isBot ? '1234567890' : '987654321', // Distinguishing bot vs. user messages
  isFromBot: () => isBot,
}));

describe('OpenAiManager buildRequestBody', () => {
  let openAiManager;

  beforeEach(() => {
    // Initialize OpenAiManager before each test
    openAiManager = new OpenAiManager();
  });

  test('correctly structures payload ensuring assistant messages follow user messages', () => {
    // Setup for mocked messages (assuming proper mock implementations elsewhere)
    const historyMessages = [
      new DiscordMessage("You are Discord bot and the most recent message triggered you to respond.", false), // User message triggering the response
      new DiscordMessage("Sorry, I encountered an error processing your message.", true), // Assistant message
      new DiscordMessage("I am fine, thank you!", false), // User message
      new DiscordMessage("Hello, how are you?", false), // Another User message
    ];

    const expectedPayload = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: 'system',
          content: "You are a helpful assistant."
        },
        // Note: The assistant message has been moved after the user message as per the new logic
        {
          role: 'user',
          content: "You are Discord bot and the most recent message triggered you to respond."
        },
        {
          role: 'assistant',
          content: "Sorry, I encountered an error processing your message."
        },
        {
          role: 'user',
          content: "I am fine, thank you!"
        },
        {
          role: 'user',
          content: "Hello, how are you?"
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    };

    // Call the method under test with the prepared historyMessages
    const result = openAiManager.buildRequestBody(historyMessages);

    // Assertions to verify the method outputs the expected payload
    expect(result).toEqual(expectedPayload);
  });
});
