// Define a constants object to mirror the mocked values
const constants = {
  CLIENT_ID: '1234567890',
  LLM_MODEL: "gpt-3.5-turbo",
  LLM_SYSTEM_PROMPT: "You are a helpful assistant.",
  LLM_MAX_TOKENS: 150,
  LLM_TEMPERATURE: 0.7,
  LLM_TOP_P: 1,
  LLM_FREQUENCY_PENALTY: 0,
  LLM_PRESENCE_PENALTY: 0,
  USE_PADDING_FOR_CONSECUTIVE_MESSAGES: false,
  ADJUST_CONVERSATION_ENDING: true,
  PADDING_CONTENT: "...",
  ADJUSTMENT_CONTENT: "...",
};

jest.mock('../../src/models/DiscordMessage');
jest.mock('openai', () => {
  // Mock the Configuration and OpenAIApi directly
  const mockOpenAIApi = jest.fn().mockImplementation(() => ({
    createCompletion: jest.fn().mockResolvedValue({ data: 'mocked data' }),
  }));
  return {
    Configuration: jest.fn(), // Keep as is if you don't need to mock its internals
    OpenAIApi: mockOpenAIApi, // Adjust this to mock OpenAIApi as a constructor
  };
});

const OpenAiManager = require('../../src/managers/OpenAiManager');
const DiscordMessage = require('../../src/models/DiscordMessage');
DiscordMessage.mockImplementation((content, isBot = false) => ({
  getText: () => content,
  getChannelId: () => '1234567890',
  getAuthorId: () => isBot ? '1234567890' : '987654321',
  isFromBot: () => isBot,
}));

describe('OpenAiManager', () => {
  let openAiManager;

  beforeEach(() => {
    openAiManager = new OpenAiManager();
  });

  test('structures payload correctly according to message roles and system prompts', () => {
    // Setup your history messages here
    const historyMessages = [
      new DiscordMessage("System prompt", true), // Assuming true signifies a system or bot message
      new DiscordMessage("User message 1", false),
      new DiscordMessage("Assistant response", true),
      new DiscordMessage("User message 2", false),
      // Add more messages as needed to test your logic
    ];

    // Use the defined constants object for expected payload
    const expectedPayload = {
      model: constants.LLM_MODEL,
      messages: [
        { role: 'system', content: "System prompt" },
        { role: 'user', content: "User message 1" },
        { role: 'assistant', content: "Assistant response" },
        { role: 'user', content: "User message 2" },
        // Adjust based on your specific logic and requirements
      ],
    };

    const result = openAiManager.buildRequestBody(historyMessages);

    expect(result).toEqual(expectedPayload);
  });
});
