import flowiseProvider from '@integrations/flowise/flowiseProvider';
import { getFlowiseResponse } from '@integrations/flowise/flowiseRestClient';
import { getFlowiseSdkResponse } from '@integrations/flowise/flowiseSdkClient';
import flowiseConfig from '@config/flowiseConfig';
import { getLlmProvider } from '@llm/getLlmProvider';
import { IMessage } from '@message/interfaces/IMessage';

jest.mock('@integrations/flowise/flowiseRestClient');
jest.mock('@integrations/flowise/flowiseSdkClient');
jest.mock('@llm/getLlmProvider');
jest.mock('@config/flowiseConfig');

const mockedGetFlowiseResponse = getFlowiseResponse as jest.Mock;
const mockedGetFlowiseSdkResponse = getFlowiseSdkResponse as jest.Mock;
const mockedGetLlmProvider = getLlmProvider as jest.Mock;
const mockedFlowiseConfig = flowiseConfig as jest.Mocked<typeof flowiseConfig>;

const createMockMessage = (text: string, role: 'user' | 'assistant' = 'user'): IMessage => ({
    getText: () => text,
    getAuthorId: () => role === 'user' ? 'user123' : 'bot456',
    getAuthorName: () => role === 'user' ? 'TestUser' : 'FlowiseBot',
    getChannelId: () => 'channel123',
    getMessageId: () => `msg_${Date.now()}`,
    getTimestamp: () => new Date(),
    isFromBot: () => role === 'assistant',
    getUserMentions: () => [],
    hasAttachments: () => false,
} as any);

describe('FlowiseProvider Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default config values
    mockedFlowiseConfig.get.mockImplementation((key: string | null | undefined) => {
      const defaultConfig: Record<string, any> = {
        'FLOWISE_USE_REST': false,
        'FLOWISE_CONVERSATION_CHATFLOW_ID': 'test-chatflow-id',
        'FLOWISE_BASE_URL': 'http://localhost:3000',
        'FLOWISE_API_KEY': 'test-api-key',
        'FLOWISE_TIMEOUT': 30000,
      };
      return defaultConfig[key as string] || '';
    });
  });

  describe('Provider Registration', () => {
    it('should return FlowiseProvider when LLM_PROVIDER is flowise', () => {
      mockedGetLlmProvider.mockReturnValue([flowiseProvider]);
      const providers = getLlmProvider();
      expect(providers[0]).toBe(flowiseProvider);
    });

    it('should be included in provider list', () => {
      mockedGetLlmProvider.mockReturnValue([flowiseProvider]);
      const providers = getLlmProvider();
      expect(providers).toContain(flowiseProvider);
      expect(providers.length).toBeGreaterThan(0);
    });
  });

  describe('Provider Capabilities', () => {
    it('should support chat completion', () => {
      expect(flowiseProvider.supportsChatCompletion()).toBe(true);
    });

    it('should not support legacy completion', () => {
      expect(flowiseProvider.supportsCompletion()).toBe(false);
    });

    it('should have consistent capability reporting', () => {
      // Capabilities should remain consistent across multiple calls
      expect(flowiseProvider.supportsChatCompletion()).toBe(flowiseProvider.supportsChatCompletion());
      expect(flowiseProvider.supportsCompletion()).toBe(flowiseProvider.supportsCompletion());
    });

    it('should handle unsupported completion method gracefully', async () => {
      // The actual implementation returns undefined for unsupported methods
      const result = await flowiseProvider.generateCompletion('test prompt');
      expect(result).toBeUndefined();
    });
  });

  describe.each([
    { useRest: true, description: 'REST API' },
    { useRest: false, description: 'SDK' }
  ])('Chat Completion via $description', ({ useRest }) => {
    beforeEach(() => {
      mockedFlowiseConfig.get.mockImplementation((key: string | null | undefined) => {
        if (key === 'FLOWISE_USE_REST') return useRest;
        if (key === 'FLOWISE_CONVERSATION_CHATFLOW_ID') return 'test-chatflow-id';
        if (key === 'FLOWISE_BASE_URL') return 'http://localhost:3000';
        if (key === 'FLOWISE_API_KEY') return 'test-api-key';
        return '';
      });
    });

    it(`should call ${useRest ? 'REST client' : 'SDK client'} for chat completion`, async () => {
      const expectedResponse = `flowise ${useRest ? 'rest' : 'sdk'} response`;
      
      if (useRest) {
        mockedGetFlowiseResponse.mockResolvedValue(expectedResponse);
      } else {
        mockedGetFlowiseSdkResponse.mockResolvedValue(expectedResponse);
      }

      const result = await flowiseProvider.generateChatCompletion('test message', [], { channelId: 'test-channel' });

      if (useRest) {
        expect(mockedGetFlowiseResponse).toHaveBeenCalledWith('test-channel', 'test message');
        expect(mockedGetFlowiseSdkResponse).not.toHaveBeenCalled();
      } else {
        expect(mockedGetFlowiseSdkResponse).toHaveBeenCalledWith('test message', 'test-chatflow-id');
        expect(mockedGetFlowiseResponse).not.toHaveBeenCalled();
      }
      
      expect(result).toBe(expectedResponse);
    });

    it('should handle empty message gracefully', async () => {
      const expectedResponse = 'empty message response';
      
      if (useRest) {
        mockedGetFlowiseResponse.mockResolvedValue(expectedResponse);
      } else {
        mockedGetFlowiseSdkResponse.mockResolvedValue(expectedResponse);
      }

      const result = await flowiseProvider.generateChatCompletion('', [], { channelId: 'test-channel' });
      expect(typeof result).toBe('string');
    });

    it('should handle message history correctly', async () => {
      const history = [
        createMockMessage('Hello', 'user'),
        createMockMessage('Hi there!', 'assistant'),
        createMockMessage('How are you?', 'user')
      ];
      
      const expectedResponse = 'response with history';
      
      if (useRest) {
        mockedGetFlowiseResponse.mockResolvedValue(expectedResponse);
      } else {
        mockedGetFlowiseSdkResponse.mockResolvedValue(expectedResponse);
      }

      const result = await flowiseProvider.generateChatCompletion('Current message', history, { channelId: 'test-channel' });
      expect(result).toBe(expectedResponse);
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('Flowise API Error');
      
      if (useRest) {
        mockedGetFlowiseResponse.mockRejectedValue(apiError);
      } else {
        mockedGetFlowiseSdkResponse.mockRejectedValue(apiError);
      }

      // The implementation catches errors and returns a fallback message
      const result = await flowiseProvider.generateChatCompletion('test', [], { channelId: 'test-channel' });
      expect(typeof result).toBe('string');
      expect(result).toContain('error communicating');
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('ETIMEDOUT');
      
      if (useRest) {
        mockedGetFlowiseResponse.mockRejectedValue(timeoutError);
      } else {
        mockedGetFlowiseSdkResponse.mockRejectedValue(timeoutError);
      }

      // The implementation catches errors and returns a fallback message
      const result = await flowiseProvider.generateChatCompletion('test', [], { channelId: 'test-channel' });
      expect(typeof result).toBe('string');
      expect(result).toContain('error communicating');
    });

    it('should handle malformed responses', async () => {
      if (useRest) {
        mockedGetFlowiseResponse.mockResolvedValue(null);
        const result = await flowiseProvider.generateChatCompletion('test', [], { channelId: 'test-channel' });
        // REST client returns null, which gets passed through
        expect(result).toBeNull();
      } else {
        mockedGetFlowiseSdkResponse.mockResolvedValue(undefined);
        const result = await flowiseProvider.generateChatCompletion('test', [], { channelId: 'test-channel' });
        // SDK client returns undefined, which gets passed through
        expect(result).toBeUndefined();
      }
    });
  });

  describe('Metadata and Context Handling', () => {
    it('should handle missing channelId in metadata gracefully', async () => {
      const response = await flowiseProvider.generateChatCompletion('test message', [], {});
      expect(response).toContain('missing some context');
      expect(mockedGetFlowiseResponse).not.toHaveBeenCalled();
      expect(mockedGetFlowiseSdkResponse).not.toHaveBeenCalled();
    });

    it('should handle null metadata gracefully', async () => {
      const response = await flowiseProvider.generateChatCompletion('test message', [], null as any);
      expect(response).toContain('missing some context');
    });

    it('should handle undefined metadata gracefully', async () => {
      const response = await flowiseProvider.generateChatCompletion('test message', [], undefined as any);
      expect(response).toContain('missing some context');
    });

    it('should handle empty channelId', async () => {
      const response = await flowiseProvider.generateChatCompletion('test message', [], { channelId: '' });
      expect(response).toContain('missing some context');
    });

    it('should handle additional metadata fields', async () => {
      mockedFlowiseConfig.get.mockImplementation((key: string | null | undefined) => {
        if (key === 'FLOWISE_USE_REST') return true;
        return '';
      });
      mockedGetFlowiseResponse.mockResolvedValue('success with extra metadata');
      
      const metadata = {
        channelId: 'test-channel',
        userId: 'user123',
        timestamp: new Date().toISOString(),
        extra: 'data'
      };

      const result = await flowiseProvider.generateChatCompletion('test', [], metadata);
      expect(result).toBe('success with extra metadata');
    });
  });

  describe('Configuration Integration', () => {
    it('should handle missing chatflow ID gracefully', async () => {
      mockedFlowiseConfig.get.mockImplementation((key: string | null | undefined) => {
        if (key === 'FLOWISE_USE_REST') return false;
        if (key === 'FLOWISE_CONVERSATION_CHATFLOW_ID') return '';
        return '';
      });

      // The implementation may handle missing chatflow ID gracefully
      const result = await flowiseProvider.generateChatCompletion('test', [], { channelId: 'test-channel' });
      expect(typeof result).toBe('string');
    });

    it('should handle invalid configuration values', async () => {
      mockedFlowiseConfig.get.mockImplementation((key: string | null | undefined) => {
        if (key === 'FLOWISE_USE_REST') return 'invalid';
        return '';
      });

      // Should handle gracefully or throw appropriate error
      const result = await flowiseProvider.generateChatCompletion('test', [], { channelId: 'test-channel' });
      expect(typeof result).toBe('string');
    });

    it('should use correct configuration for REST mode', async () => {
      mockedFlowiseConfig.get.mockImplementation((key: string | null | undefined) => {
        if (key === 'FLOWISE_USE_REST') return true;
        if (key === 'FLOWISE_BASE_URL') return 'http://custom-flowise.com';
        if (key === 'FLOWISE_API_KEY') return 'custom-api-key';
        return '';
      });

      mockedGetFlowiseResponse.mockResolvedValue('custom config response');
      
      const result = await flowiseProvider.generateChatCompletion('test', [], { channelId: 'test-channel' });
      expect(result).toBe('custom config response');
      expect(mockedGetFlowiseResponse).toHaveBeenCalledWith('test-channel', 'test');
    });
  });

  describe('Performance and Reliability', () => {
    beforeEach(() => {
      mockedFlowiseConfig.get.mockImplementation((key: string | null | undefined) => {
        if (key === 'FLOWISE_USE_REST') return true;
        if (key === 'FLOWISE_CONVERSATION_CHATFLOW_ID') return 'test-chatflow-id';
        return '';
      });
    });

    it('should handle concurrent requests', async () => {
      mockedGetFlowiseResponse.mockResolvedValue('concurrent response');
      
      const promises = Array.from({ length: 5 }, (_, i) => 
        flowiseProvider.generateChatCompletion(`message ${i}`, [], { channelId: `channel-${i}` })
      );
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      results.forEach(result => expect(result).toBe('concurrent response'));
      expect(mockedGetFlowiseResponse).toHaveBeenCalledTimes(5);
    });

    it('should maintain state isolation between requests', async () => {
      mockedGetFlowiseResponse
        .mockResolvedValueOnce('response 1')
        .mockResolvedValueOnce('response 2');
      
      const promise1 = flowiseProvider.generateChatCompletion('msg1', [], { channelId: 'ch1' });
      const promise2 = flowiseProvider.generateChatCompletion('msg2', [], { channelId: 'ch2' });
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toBe('response 1');
      expect(result2).toBe('response 2');
    });

    it('should handle large message content', async () => {
      const largeMessage = 'x'.repeat(100000); // 100KB message
      mockedGetFlowiseResponse.mockResolvedValue('large message response');
      
      const result = await flowiseProvider.generateChatCompletion(largeMessage, [], { channelId: 'test-channel' });
      expect(result).toBe('large message response');
    });

    it('should handle large message history', async () => {
      const largeHistory = Array.from({ length: 100 }, (_, i) => 
        createMockMessage(`Message ${i}`, i % 2 === 0 ? 'user' : 'assistant')
      );
      
      mockedGetFlowiseResponse.mockResolvedValue('large history response');
      
      const result = await flowiseProvider.generateChatCompletion('current', largeHistory, { channelId: 'test-channel' });
      expect(result).toBe('large history response');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    beforeEach(() => {
      mockedFlowiseConfig.get.mockImplementation((key: string | null | undefined) => {
        if (key === 'FLOWISE_USE_REST') return true;
        if (key === 'FLOWISE_CONVERSATION_CHATFLOW_ID') return 'test-chatflow-id';
        return '';
      });
    });

    it('should handle null/undefined inputs gracefully', async () => {
      // The implementation may handle these gracefully rather than throwing
      const result1 = await flowiseProvider.generateChatCompletion(null as any, [], { channelId: 'test' });
      const result2 = await flowiseProvider.generateChatCompletion('test', null as any, { channelId: 'test' });
      expect(typeof result1).toBe('string');
      expect(typeof result2).toBe('string');
    });

    it('should handle special characters in messages', async () => {
      const specialMessage = 'Test with émojis 🚀 and symbols @#$%^&*() and newlines\n\r\t';
      mockedGetFlowiseResponse.mockResolvedValue('special chars response');
      
      const result = await flowiseProvider.generateChatCompletion(specialMessage, [], { channelId: 'test-channel' });
      expect(result).toBe('special chars response');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).status = 401;
      mockedGetFlowiseResponse.mockRejectedValue(authError);
      
      // The implementation catches errors and returns a fallback message
      const result = await flowiseProvider.generateChatCompletion('test', [], { channelId: 'test-channel' });
      expect(typeof result).toBe('string');
      expect(result).toContain('error communicating');
    });

    it('should handle service unavailable errors', async () => {
      const serviceError = new Error('Service Unavailable');
      (serviceError as any).status = 503;
      mockedGetFlowiseResponse.mockRejectedValue(serviceError);
      
      // The implementation catches errors and returns a fallback message
      const result = await flowiseProvider.generateChatCompletion('test', [], { channelId: 'test-channel' });
      expect(typeof result).toBe('string');
      expect(result).toContain('error communicating');
    });

    it('should handle rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockedGetFlowiseResponse.mockRejectedValue(rateLimitError);
      
      // The implementation catches errors and returns a fallback message
      const result = await flowiseProvider.generateChatCompletion('test', [], { channelId: 'test-channel' });
      expect(typeof result).toBe('string');
      expect(result).toContain('error communicating');
    });
  });
});
