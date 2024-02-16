// Import dependencies and OpenAiManager
const OpenAiManager = require('../../src/managers/OpenAiManager');

// Mocking necessary modules
jest.mock('../../src/models/DiscordMessage');
jest.mock('../../src/config/constants', () => ({
  CLIENT_ID: '1234567890',  
  LLM_MODEL: "gpt-3.5-turbo",
  LLM_SYSTEM_PROMPT: "You are a helpful assistant.",
  LLM_MAX_TOKENS: 150,
  LLM_TEMPERATURE: 0.7,
  LLM_TOP_P: 1,
  LLM_FREQUENCY_PENALTY: 0,
  LLM_PRESENCE_PENALTY: 0,
  
}));

const DiscordMessage = require('../../src/models/DiscordMessage');
// Adjusted mock implementation to reflect the new constructor signature
DiscordMessage.mockImplementation((content, isBot = false) => ({
  getText: () => content,
  getChannelId: () => '1234567890',
  getAuthorId: () => isBot ? '1234567890' : '987654321',
  isFromBot: () => isBot,
}));

describe('OpenAiManager buildRequestBody', () => {
  beforeEach(() => {
    openAiManager = new OpenAiManager();
  });

  test('correctly structures payload with system message first, followed by user messages, and assistant messages last', () => {
    const historyMessages = [
      new DiscordMessage("You are Discord bot and the most recent message triggered you to respond.", false),
      new DiscordMessage("Sorry, I encountered an error processing your message.", true),
      new DiscordMessage("I am fine, thank you!", false),
      new DiscordMessage("Hello, how are you?", false),
    ].reverse(); // Assuming reverse is correct based on your requirements

      const expectedPayload = {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: 'system',
            content: "You are a helpful assistant."
          },
          {
            role: 'user',
            content: "Hello, how are you?"
          },
          {
            role: 'user',
            content: "I am fine, thank you!"
          },
          {
            role: 'assistant',
            content: "Sorry, I encountered an error processing your message."
          },
          {
            role: 'user',
            content: "You are Discord bot and the most recent message triggered you to respond."
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      };
  
      const result = openAiManager.buildRequestBody(historyMessages.reverse());
  
      expect(result).toEqual(expectedPayload);
    });
  });
  

