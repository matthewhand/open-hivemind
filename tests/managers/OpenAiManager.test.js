const OpenAiManager = require('../../src/managers/OpenAiManager');

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
  // Mock any other constants you introduced in your new logic, if necessary
  USE_PADDING_FOR_CONSECUTIVE_MESSAGES: false, // Assuming you added this constant
  ADJUST_CONVERSATION_ENDING: true, // Assuming you added this constant
  PADDING_CONTENT: "...", // Assuming you added this constant
  ADJUSTMENT_CONTENT: "...", // Assuming this is for ending adjustment
}));

const DiscordMessage = require('../../src/models/DiscordMessage');
DiscordMessage.mockImplementation((content, isBot = false) => ({
  getText: () => content,
  getChannelId: () => '1234567890',
  getAuthorId: () => isBot ? '1234567890' : '987654321',
  isFromBot: () => isBot,
}));

describe('OpenAiManager buildRequestBody', () => {
  let openAiManager;

  beforeEach(() => {
    openAiManager = new OpenAiManager();
  });

  test('correctly structures payload with system message first, followed by user messages, and assistant messages last, including corrections', () => {
    const historyMessages = [
      new DiscordMessage("You are Discord bot and the most recent message triggered you to respond.", false),
      new DiscordMessage("Sorry, I encountered an error processing your message.", true),
      new DiscordMessage("I am fine, thank you!", false),
      new DiscordMessage("Hello, how are you?", false),
    ];
  
    const expectedPayload = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: 'system',
          content: "You are a helpful assistant."
        },
        // Your logic for padding and message role corrections goes here
        // This needs to match the updated logic in OpenAiManager
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
        // If you added logic for adjustment at the end, ensure to reflect that in expectedPayload
      ],
    };

    const result = openAiManager.buildRequestBody(historyMessages);

    expect(result).toEqual(expectedPayload);
  });
});
