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
    it('should support chat completion', () => {
      expect(openAiProvider.supportsChatCompletion()).toBe(true);
    });

    it('should support legacy completion', () => {
      expect(openAiProvider.supportsCompletion()).toBe(true);
    });

    it('should have consistent capability reporting', () => {
      // Both capabilities should remain consistent across multiple calls
      expect(openAiProvider.supportsChatCompletion()).toBe(openAiProvider.supportsChatCompletion());
      expect(openAiProvider.supportsCompletion()).toBe(openAiProvider.supportsCompletion());
    });
  });

  describe('Legacy Completion', () => {
    it('should generate completion with basic prompt', async () => {
      const response = await openAiProvider.generateCompletion('test prompt');
      expect(typeof response).toBe('string');
      expect(response).toBe('mocked legacy response');
      expect(mockCompletionsCreate).toHaveBeenCalledTimes(1);
    });

    it('should handle empty prompt gracefully', async () => {
      const response = await openAiProvider.generateCompletion('');
      expect(typeof response).toBe('string');
      expect(response).toBe('mocked legacy response');
      expect(mockCompletionsCreate).toHaveBeenCalledWith(expect.objectContaining({
        prompt: ''
      }));
    });

    it('should handle very long prompts', async () => {
      const longPrompt = 'a'.repeat(10000);
      const response = await openAiProvider.generateCompletion(longPrompt);
      expect(typeof response).toBe('string');
      expect(mockCompletionsCreate).toHaveBeenCalledWith(expect.objectContaining({
        prompt: longPrompt
      }));
    });

    it('should handle special characters in prompts', async () => {
      const specialPrompt = 'Test with émojis 🚀 and symbols @#$%^&*()';
      const response = await openAiProvider.generateCompletion(specialPrompt);
      expect(typeof response).toBe('string');
      expect(mockCompletionsCreate).toHaveBeenCalledWith(expect.objectContaining({
        prompt: specialPrompt
      }));
    });

    it('should handle API errors gracefully', async () => {
      mockCompletionsCreate.mockRejectedValue(new Error('API Error'));
      await expect(openAiProvider.generateCompletion('test')).rejects.toThrow('API Error');
    });

    it('should handle malformed API responses', async () => {
      mockCompletionsCreate.mockResolvedValue({ choices: [] });
      const response = await openAiProvider.generateCompletion('test');
      expect(typeof response).toBe('string');
    });

    it('should handle null/undefined responses', async () => {
      mockCompletionsCreate.mockResolvedValue(null);
      await expect(openAiProvider.generateCompletion('test')).rejects.toThrow();
    });
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

    it('should generate chat completion with message and history', async () => {
      const history = [createMockMessage('user', 'Hello')];
      const response = await openAiProvider.generateChatCompletion('test message', history);
      expect(typeof response).toBe('string');
      expect(response).toBe('mocked chat response');
      expect(mockChatCreate).toHaveBeenCalledTimes(1);
    });

    it('should handle empty message history', async () => {
      const response = await openAiProvider.generateChatCompletion('test message', []);
      expect(typeof response).toBe('string');
      expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'test message' })
        ])
      }));
    });

    it('should include system prompt in chat completion', async () => {
      await openAiProvider.generateChatCompletion('test', []);
      expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system', content: 'You are a test assistant.' })
        ])
      }));
    });

    it('should handle large message history', async () => {
      const largeHistory = Array.from({ length: 100 }, (_, i) => 
        createMockMessage(i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`)
      );
      const response = await openAiProvider.generateChatCompletion('test', largeHistory);
      expect(typeof response).toBe('string');
      expect(mockChatCreate).toHaveBeenCalledTimes(1);
    });

    it('should handle chat completion API errors', async () => {
      mockChatCreate.mockRejectedValue(new Error('Chat API Error'));
      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow('Chat API Error');
    });

    it('should handle malformed chat responses', async () => {
      mockChatCreate.mockResolvedValue({ choices: [{ message: {} }] });
      const response = await openAiProvider.generateChatCompletion('test', []);
      expect(typeof response).toBe('string');
    });

    it('should handle empty choices array', async () => {
      mockChatCreate.mockResolvedValue({ choices: [] });
      const response = await openAiProvider.generateChatCompletion('test', []);
      expect(typeof response).toBe('string');
    });

    it('should handle network timeouts', async () => {
      mockChatCreate.mockRejectedValue(new Error('ETIMEDOUT'));
      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow('ETIMEDOUT');
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockChatCreate.mockRejectedValue(rateLimitError);
      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Configuration Integration', () => {
    it('should use configured model', async () => {
      await openAiProvider.generateChatCompletion('test', []);
      expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: 'gpt-test'
      }));
    });

    it('should use configured max tokens', async () => {
      await openAiProvider.generateChatCompletion('test', []);
      expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
        max_tokens: 50
      }));
    });

    it('should handle missing configuration gracefully', async () => {
      (mockedConfig.get as jest.Mock).mockReturnValue(undefined);
      // Should not throw, should use defaults
      await expect(openAiProvider.generateChatCompletion('test', [])).resolves.toBeDefined();
    });

    it('should handle invalid configuration values', async () => {
      (mockedConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'OPENAI_MAX_TOKENS') return 'invalid';
        if (key === 'OPENAI_TIMEOUT') return -1;
        return 'valid';
      });
      // Should handle gracefully
      await expect(openAiProvider.generateChatCompletion('test', [])).resolves.toBeDefined();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, () => 
        openAiProvider.generateChatCompletion('test', [])
      );
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(result => expect(typeof result).toBe('string'));
      expect(mockChatCreate).toHaveBeenCalledTimes(10);
    });

    it('should maintain state isolation between requests', async () => {
      const promise1 = openAiProvider.generateChatCompletion('message1', []);
      const promise2 = openAiProvider.generateChatCompletion('message2', []);
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toBe('mocked chat response');
      expect(result2).toBe('mocked chat response');
    });

    it('should handle memory pressure gracefully', async () => {
      const largeMessage = 'x'.repeat(1000000); // 1MB string
      const response = await openAiProvider.generateChatCompletion(largeMessage, []);
      expect(typeof response).toBe('string');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle null/undefined inputs', async () => {
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
    });

    it('should handle OpenAI client initialization errors', async () => {
      MockedOpenAI.mockImplementation(() => {
        throw new Error('Client initialization failed');
      });
      // Should handle gracefully or throw appropriate error
      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow();
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Invalid API key');
      (authError as any).status = 401;
      mockChatCreate.mockRejectedValue(authError);
      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow('Invalid API key');
    });

    it('should handle service unavailable errors', async () => {
      const serviceError = new Error('Service unavailable');
      (serviceError as any).status = 503;
      mockChatCreate.mockRejectedValue(serviceError);
      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow('Service unavailable');
    });
  });
});
