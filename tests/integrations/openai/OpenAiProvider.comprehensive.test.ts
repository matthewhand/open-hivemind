import { OpenAI } from 'openai';
import { OpenAiProvider, openAiProvider } from '@hivemind/provider-openai';
import openaiConfig from '@config/openaiConfig';
import { IMessage } from '@message/interfaces/IMessage';

// Mock the entire 'openai' library
jest.mock('openai');
// Mock the config
jest.mock('@config/openaiConfig');

const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
const mockedConfig = openaiConfig as jest.Mocked<typeof openaiConfig>;

describe('OpenAiProvider Comprehensive Tests', () => {
  let mockChatCreate: jest.Mock;
  let mockCompletionsCreate: jest.Mock;
  let mockOpenAIInstance: any;

  beforeEach(() => {
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
        OPENAI_API_KEY: 'test_api_key',
        OPENAI_BASE_URL: 'https://api.openai.com/v1',
        OPENAI_TIMEOUT: 10000,
        OPENAI_MODEL: 'gpt-test',
        OPENAI_SYSTEM_PROMPT: 'You are a test assistant.',
        OPENAI_MAX_TOKENS: 50,
        OPENAI_TEMPERATURE: 0.7,
        OPENAI_ORGANIZATION: undefined,
      };
      return config[key];
    });
  });

  describe('Provider Capabilities', () => {
    it('should support both completion types', () => {
      expect(openAiProvider.supportsChatCompletion()).toBe(true);
      expect(openAiProvider.supportsCompletion()).toBe(true);
    });

    it('should have correct provider name', () => {
      expect(openAiProvider.name).toBe('openai');
    });

    it('should maintain consistent capabilities across calls', () => {
      const chatSupport1 = openAiProvider.supportsChatCompletion();
      const chatSupport2 = openAiProvider.supportsChatCompletion();
      const completionSupport1 = openAiProvider.supportsCompletion();
      const completionSupport2 = openAiProvider.supportsCompletion();

      expect(chatSupport1).toBe(chatSupport2);
      expect(completionSupport1).toBe(completionSupport2);
    });
  });

  describe('generateChatCompletion', () => {
    const createMockMessage = (role: string, content: string): IMessage =>
      ({
        getText: () => content,
        getAuthorId: () => 'user123',
        getAuthorName: () => 'TestUser',
        getChannelId: () => 'channel123',
        getMessageId: () => 'msg123',
        getTimestamp: () => new Date(),
        isFromBot: () => role === 'assistant',
        getUserMentions: () => [],
        hasAttachments: () => false,
        role,
      }) as any;

    it('should generate chat completion successfully', async () => {
      const response = await openAiProvider.generateChatCompletion('test message', []);
      expect(response).toBe('mocked chat response');
      expect(mockChatCreate).toHaveBeenCalledTimes(1);
    });

    it('should include system prompt and user message', async () => {
      await openAiProvider.generateChatCompletion('test', []);
      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system', content: 'You are a test assistant.' }),
            expect.objectContaining({ role: 'user', content: 'test' }),
          ]),
        })
      );
    });

    it('should include history messages', async () => {
      const history = [
        createMockMessage('user', 'Hello'),
        createMockMessage('assistant', 'Hi there!'),
      ];
      await openAiProvider.generateChatCompletion('test', history);
      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user', content: 'Hello' }),
            expect.objectContaining({ role: 'assistant', content: 'Hi there!' }),
            expect.objectContaining({ role: 'user', content: 'test' }),
          ]),
        })
      );
    });

    it('should use metadata model override', async () => {
      await openAiProvider.generateChatCompletion('test', [], { modelOverride: 'gpt-4' });
      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
        })
      );
    });

    it('should apply temperature boost from metadata', async () => {
      await openAiProvider.generateChatCompletion('test', [], { temperatureBoost: 0.3 });
      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 1.0, // 0.7 + 0.3
        })
      );
    });

    it('should cap temperature at 1.5', async () => {
      await openAiProvider.generateChatCompletion('test', [], { temperatureBoost: 1.0 });
      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 1.5, // capped at 1.5
        })
      );
    });

    it('should use maxTokensOverride from metadata', async () => {
      await openAiProvider.generateChatCompletion('test', [], { maxTokensOverride: 200 });
      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 200,
        })
      );
    });

    it('should return empty string when API returns no content', async () => {
      mockChatCreate.mockResolvedValue({ choices: [{ message: {} }] });
      const response = await openAiProvider.generateChatCompletion('test', []);
      expect(response).toBe('');
    });

    it('should return empty string when API returns empty choices', async () => {
      mockChatCreate.mockResolvedValue({ choices: [] });
      const response = await openAiProvider.generateChatCompletion('test', []);
      expect(response).toBe('');
    });

    it('should retry on failure and eventually throw', async () => {
      mockChatCreate.mockRejectedValue(new Error('API Error'));
      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow('API Error');
      // Should retry 3 times
      expect(mockChatCreate).toHaveBeenCalledTimes(3);
    }, 15000);

    it('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, () =>
        openAiProvider.generateChatCompletion('test', [])
      );
      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      results.forEach((result) => expect(result).toBe('mocked chat response'));
    });

    it('should validate and fix invalid baseURL', async () => {
      (mockedConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'OPENAI_BASE_URL') return 'invalid-url';
        if (key === 'OPENAI_API_KEY') return 'test-key';
        return undefined;
      });

      await openAiProvider.generateChatCompletion('test', []);
      expect(MockedOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.openai.com/v1',
        })
      );
    });

    it('should handle large message content', async () => {
      const largeMessage = 'x'.repeat(100000);
      const response = await openAiProvider.generateChatCompletion(largeMessage, []);
      expect(response).toBe('mocked chat response');
    });

    it('should handle special characters in message', async () => {
      const specialMessage = 'Test with émojis 🚀 and symbols @#$%^&*()';
      const response = await openAiProvider.generateChatCompletion(specialMessage, []);
      expect(response).toBe('mocked chat response');
    });

    it('should handle empty message', async () => {
      const response = await openAiProvider.generateChatCompletion('', []);
      expect(response).toBe('mocked chat response');
    });

    it('should handle very long conversation history', async () => {
      const longHistory = Array.from({ length: 100 }, (_, i) =>
        createMockMessage(i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`)
      );
      const response = await openAiProvider.generateChatCompletion('test', longHistory);
      expect(response).toBe('mocked chat response');
    });
  });

  describe('generateCompletion (Legacy)', () => {
    it('should generate legacy completion successfully', async () => {
      const response = await openAiProvider.generateCompletion('test prompt');
      expect(response).toBe('mocked legacy response');
      expect(mockCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'test prompt',
          max_tokens: 150,
        })
      );
    });

    it('should return empty string on error', async () => {
      mockCompletionsCreate.mockRejectedValue(new Error('API Error'));
      const response = await openAiProvider.generateCompletion('test');
      expect(response).toBe('');
    });

    it('should return empty string when no response text', async () => {
      mockCompletionsCreate.mockResolvedValue({ choices: [] });
      const response = await openAiProvider.generateCompletion('test');
      expect(response).toBe('');
    });

    it('should handle null prompt gracefully', async () => {
      const response = await openAiProvider.generateCompletion(null as any);
      expect(typeof response).toBe('string');
    });

    it('should handle undefined prompt gracefully', async () => {
      const response = await openAiProvider.generateCompletion(undefined as any);
      expect(typeof response).toBe('string');
    });

    it('should handle empty prompt', async () => {
      const response = await openAiProvider.generateCompletion('');
      expect(response).toBe('mocked legacy response');
    });
  });

  describe('Constructor Configuration', () => {
    it('should accept config overrides in constructor', async () => {
      const customProvider = new OpenAiProvider({
        apiKey: 'custom-key',
        model: 'custom-model',
        systemPrompt: 'Custom prompt',
      });

      await customProvider.generateChatCompletion('test', []);

      expect(MockedOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'custom-key',
        })
      );
      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'custom-model',
        })
      );
    });

    it('should use default values when config not provided', async () => {
      const defaultProvider = new OpenAiProvider();

      await defaultProvider.generateChatCompletion('test', []);

      expect(MockedOpenAI).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      const authError = new Error('Invalid API key');
      (authError as any).status = 401;
      mockChatCreate.mockRejectedValue(authError);

      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow();
    }, 15000);

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockChatCreate.mockRejectedValue(rateLimitError);

      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow();
    }, 15000);

    it('should handle service unavailable errors', async () => {
      const serviceError = new Error('Service unavailable');
      (serviceError as any).status = 503;
      mockChatCreate.mockRejectedValue(serviceError);

      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow();
    }, 15000);

    it('should handle timeout errors', async () => {
      mockChatCreate.mockRejectedValue(new Error('ETIMEDOUT'));

      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow();
    }, 15000);

    it('should handle network errors', async () => {
      mockChatCreate.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow();
    }, 15000);

    it('should handle malformed response', async () => {
      mockChatCreate.mockResolvedValue({ choices: [{ message: null }] });

      const response = await openAiProvider.generateChatCompletion('test', []);
      expect(response).toBe('');
    });

    it('should handle null response', async () => {
      mockChatCreate.mockResolvedValue(null);

      await expect(openAiProvider.generateChatCompletion('test', [])).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle burst of requests', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        openAiProvider.generateChatCompletion(`test ${i}`, [])
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result) => expect(typeof result).toBe('string'));
    });

    it('should maintain state isolation between requests', async () => {
      const result1 = await openAiProvider.generateChatCompletion('message1', []);
      const result2 = await openAiProvider.generateChatCompletion('message2', []);

      expect(result1).toBe('mocked chat response');
      expect(result2).toBe('mocked chat response');
    });
  });

  describe('Edge Cases', () => {
    it('should handle unicode in messages', async () => {
      const unicodeMessage = '你好世界 🌍 مرحبا';
      const response = await openAiProvider.generateChatCompletion(unicodeMessage, []);
      expect(response).toBe('mocked chat response');
    });

    it('should handle newlines and special formatting', async () => {
      const formattedMessage = 'Line 1\nLine 2\tTabbed\r\nWindows line ending';
      const response = await openAiProvider.generateChatCompletion(formattedMessage, []);
      expect(response).toBe('mocked chat response');
    });

    it('should handle JSON content in message', async () => {
      const jsonMessage = JSON.stringify({ key: 'value', nested: { data: [1, 2, 3] } });
      const response = await openAiProvider.generateChatCompletion(jsonMessage, []);
      expect(response).toBe('mocked chat response');
    });

    it('should handle code snippets in message', async () => {
      const codeMessage = '```javascript\nconst x = () => {\n  return "hello";\n};\n```';
      const response = await openAiProvider.generateChatCompletion(codeMessage, []);
      expect(response).toBe('mocked chat response');
    });

    it('should handle markdown in message', async () => {
      const markdownMessage = '# Heading\n\n**Bold** and *italic*\n\n- List item';
      const response = await openAiProvider.generateChatCompletion(markdownMessage, []);
      expect(response).toBe('mocked chat response');
    });
  });
});
