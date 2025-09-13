import { openAiProvider } from '@integrations/openai/openAiProvider';
import openaiConfig from '@config/openaiConfig';
import { OpenAI } from 'openai';
import { IMessage } from '@message/interfaces/IMessage';

// Mock the entire 'openai' library
jest.mock('openai');
// Mock the config
jest.mock('@config/openaiConfig');

const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
const mockedConfig = openaiConfig as jest.Mocked<typeof openaiConfig>;

describe('openAiProvider', () => {
  let mockChatCreate: jest.Mock;
  let mockCompletionsCreate: jest.Mock;
  let mockOpenAIInstance: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup mock for chat completions
    mockChatCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'mocked chat response' } }],
    });
    // Setup mock for legacy completions
    mockCompletionsCreate = jest.fn().mockResolvedValue({
      choices: [{ text: 'mocked legacy response' }],
    });

    // Create mock OpenAI instance
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: mockChatCreate,
        },
      },
      completions: {
        create: mockCompletionsCreate,
      },
    };

    // Make the OpenAI constructor return the mocked instance
    MockedOpenAI.mockImplementation(() => mockOpenAIInstance);

    // Mock config values
    (mockedConfig.get as jest.Mock).mockImplementation((key: string) => {
      const config: { [key: string]: any } = {
        'OPENAI_API_KEY': 'test_api_key',
        'OPENAI_BASE_URL': 'https://api.openai.com/v1',
        'OPENAI_TIMEOUT': 10000,
        'OPENAI_MODEL': 'gpt-test',
        'OPENAI_SYSTEM_PROMPT': 'You are a test assistant.',
        'OPENAI_MAX_TOKENS': 50,
      };
      return config[key];
    });
  });

  describe('Provider Capabilities', () => {
    it('should support both completion types consistently', () => {
      expect(openAiProvider.supportsChatCompletion()).toBe(true);
      expect(openAiProvider.supportsCompletion()).toBe(true);
      // Both capabilities should remain consistent across multiple calls
      expect(openAiProvider.supportsChatCompletion()).toBe(openAiProvider.supportsChatCompletion());
      expect(openAiProvider.supportsCompletion()).toBe(openAiProvider.supportsCompletion());
    });
  });

  describe('Legacy Completion', () => {
    const promptCases = [
      { prompt: 'test prompt', expectedCalls: 1, expectResponse: true },
      { prompt: '', expectedCalls: 1, expectResponse: true },
      { prompt: 'a'.repeat(100), expectedCalls: 1, expectResponse: true },
      { prompt: 'Test with émojis 🚀 and symbols @#$%^&*()', expectedCalls: 1, expectResponse: true },
    ];

    it.each(promptCases)('should handle various prompts: $prompt', async ({ prompt, expectedCalls, expectResponse }) => {
      const response = await openAiProvider.generateCompletion(prompt);
      if (expectResponse) {
        expect(typeof response).toBe('string');
        expect(response).toBe('mocked legacy response');
      }
      expect(mockCompletionsCreate).toHaveBeenCalledWith(expect.objectContaining({ prompt }));
      expect(mockCompletionsCreate).toHaveBeenCalledTimes(expectedCalls);
    });

    it('should handle legacy completion errors gracefully', async () => {
      mockCompletionsCreate.mockRejectedValue(new Error('API Error'));
      await expect(openAiProvider.generateCompletion('test')).rejects.toThrow('Non-chat completion failed after 3 attempts: API Error');

      mockCompletionsCreate.mockResolvedValue({ choices: [] });
      const response = await openAiProvider.generateCompletion('test');
      expect(typeof response).toBe('string');

      mockCompletionsCreate.mockResolvedValue(null);
      await expect(openAiProvider.generateCompletion('test')).rejects.toThrow();
    }, 10000);
  });

  describe('Chat Completion', () => {
    const createMockMessage = (role: string, content: string): IMessage => ({
      getText: () => content,
      getAuthorId: () => 'user123',
      getAuthorName: () => 'TestUser',
      getChannelId: () => 'channel123',
      getMessageId: () => 'msg123',
      getTimestamp: () => new Date(),
      isFromBot: () => role === 'assistant',
      getUserMentions: () => [],
      hasAttachments: () => false,
    } as any);

    const historyCases = [
      { history: [createMockMessage('user', 'Hello')], desc: 'with history' },
      { history: [], desc: 'empty history' },
      { history: Array.from({ length: 100 }, (_, i) => createMockMessage(i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`)), desc: 'large history' },
    ];

    it.each(historyCases)('should generate chat completion $desc', async ({ history, desc }) => {
      const response = await openAiProvider.generateChatCompletion('test message', history);
      expect(typeof response).toBe('string');
      expect(response).toBe('mocked chat response');
      expect(mockChatCreate).toHaveBeenCalledTimes(1);
      if (desc === 'empty history') {
        expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user', content: 'test message' })
          ])
        }));
      }
    });

    it('should include system prompt in chat completion', async () => {
      await openAiProvider.generateChatCompletion('test', []);
      expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system', content: 'You are a test assistant.' })
        ])
      }));
    });

    it('should handle chat completion errors and malformed responses', async () => {
      mockChatCreate.mockRejectedValue(new Error('Chat API Error'));
      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow('Chat completion failed after 3 attempts: Chat API Error');

      mockChatCreate.mockRejectedValue(new Error('ETIMEDOUT'));
      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow('Chat completion failed after 3 attempts: ETIMEDOUT');

      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockChatCreate.mockRejectedValue(rateLimitError);
      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow('Chat completion failed after 3 attempts: Rate limit exceeded');

      mockChatCreate.mockResolvedValue({ choices: [{ message: {} }] });
      const response = await openAiProvider.generateChatCompletion('test', []);
      expect(typeof response).toBe('string');

      mockChatCreate.mockResolvedValue({ choices: [] });
      const response2 = await openAiProvider.generateChatCompletion('test', []);
      expect(typeof response2).toBe('string');
    }, 10000);
  });

  describe('Configuration Integration', () => {
    it('should use configured values and handle missing/invalid gracefully', async () => {
      await openAiProvider.generateChatCompletion('test', []);
      expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: 'gpt-test',
        max_tokens: 50
      }));

      (mockedConfig.get as jest.Mock).mockReturnValue(undefined);
      await expect(openAiProvider.generateChatCompletion('test', [])).resolves.toBeDefined();

      (mockedConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'OPENAI_MAX_TOKENS') return 'invalid';
        if (key === 'OPENAI_TIMEOUT') return -1;
        return 'valid';
      });
      await expect(openAiProvider.generateChatCompletion('test', [])).resolves.toBeDefined();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent requests, state isolation, and memory pressure', async () => {
      const promises = Array.from({ length: 10 }, () =>
        openAiProvider.generateChatCompletion('test', [])
      );
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(result => expect(typeof result).toBe('string'));
      expect(mockChatCreate).toHaveBeenCalledTimes(10);

      const promise1 = openAiProvider.generateChatCompletion('message1', []);
      const promise2 = openAiProvider.generateChatCompletion('message2', []);
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toBe('mocked chat response');
      expect(result2).toBe('mocked chat response');

      const largeMessage = 'x'.repeat(1000000); // 1MB string
      const response = await openAiProvider.generateChatCompletion(largeMessage, []);
      expect(typeof response).toBe('string');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle null/undefined inputs and client errors', async () => {
      // The implementation may handle these gracefully rather than throwing
      const result1 = await openAiProvider.generateCompletion(null as any);
      const result2 = await openAiProvider.generateCompletion(undefined as any);
      
      expect(typeof result1).toBe('string');
      expect(typeof result2).toBe('string');
      
      // For chat completion with null history, expect it to throw due to .map() call
      await expect(openAiProvider.generateChatCompletion('test', null as any)).rejects.toThrow();
      
      // But null message should work
      const result3 = await openAiProvider.generateChatCompletion(null as any, []);
      expect(typeof result3).toBe('string');

      MockedOpenAI.mockImplementation(() => {
        throw new Error('Client initialization failed');
      });
      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow();
    }, 10000);

    it('should handle authentication and service errors', async () => {
      const authError = new Error('Invalid API key');
      (authError as any).status = 401;
      mockChatCreate.mockRejectedValue(authError);
      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow('Chat completion failed after 3 attempts: Invalid API key');

      const serviceError = new Error('Service unavailable');
      (serviceError as any).status = 503;
      mockChatCreate.mockRejectedValue(serviceError);
      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow('Chat completion failed after 3 attempts: Service unavailable');
    }, 10000);
  });
});
