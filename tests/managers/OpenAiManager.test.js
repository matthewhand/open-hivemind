jest.mock('../../src/config/constants', () => ({
  CLIENT_ID: '1234567890', // Mock bot ID to match with openAiManager.botId
  LLM_MODEL: "gpt-3.5-turbo",
  LLM_SYSTEM_PROMPT: "System prompt message",
  LLM_MAX_TOKENS: 150,
  LLM_TEMPERATURE: 0.7,
  LLM_TOP_P: 1,
  LLM_FREQUENCY_PENALTY: 0,
  LLM_PRESENCE_PENALTY: 0,
}));

const OpenAiManager = require('../../src/managers/OpenAiManager');

describe('OpenAiManager buildRequestBody', () => {
  let openAiManager;

  beforeEach(() => {
    openAiManager = new OpenAiManager();
  });

  test('correctly structures payload with mixed message history and system prompt', () => {
    const historyMessages = [
      { authorId: 'not-bot', content: 'Hello, how are you?' }, // Simulate user messages
      { authorId: 'not-bot', content: 'I am fine, thank you!' },
    ];
    const userMessage = { authorId: 'not-bot', content: 'Can you tell me a joke?' }; // Simulate a user message

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

    const result = openAiManager.buildRequestBody([...historyMessages, userMessage]);
    expect(result).toEqual(expectedPayload);
  });

  // Continue with other tests...
});
