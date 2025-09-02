import { generateChatCompletionDirect } from '@integrations/openwebui/directClient';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OpenWebUI Direct Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateChatCompletionDirect', () => {
    const validOverrides = {
      apiUrl: 'https://api.openwebui.com',
      authHeader: 'Bearer token123',
      model: 'gpt-3.5-turbo'
    };

    it('throws error when apiUrl is missing', async () => {
      await expect(generateChatCompletionDirect(
        { apiUrl: '', model: 'gpt-3.5-turbo' },
        'test message'
      )).rejects.toThrow('OpenWebUI overrides require apiUrl and model');
    });

    it('throws error when model is missing', async () => {
      await expect(generateChatCompletionDirect(
        { apiUrl: 'https://api.openwebui.com', model: '' },
        'test message'
      )).rejects.toThrow('OpenWebUI overrides require apiUrl and model');
    });

    it('throws error when overrides is null', async () => {
      await expect(generateChatCompletionDirect(
        null as any,
        'test message'
      )).rejects.toThrow('OpenWebUI overrides require apiUrl and model');
    });

    it('successfully generates completion with valid response', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'This is a test response'
            }
          }]
        }
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const result = await generateChatCompletionDirect(
        validOverrides,
        'Hello, how are you?'
      );

      expect(result).toBe('This is a test response');
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.openwebui.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123'
        },
        timeout: 15000
      });
    });

    it('handles API URL with trailing slash', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Response without trailing slash'
            }
          }]
        }
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const result = await generateChatCompletionDirect(
        { ...validOverrides, apiUrl: 'https://api.openwebui.com/' },
        'test message'
      );

      expect(result).toBe('Response without trailing slash');
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({ baseURL: 'https://api.openwebui.com' })
      );
    });

    it('works without auth header', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Response without auth'
            }
          }]
        }
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const result = await generateChatCompletionDirect(
        { apiUrl: 'https://api.openwebui.com', model: 'gpt-3.5-turbo' },
        'test message'
      );

      expect(result).toBe('Response without auth');
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
    });

    it('includes system prompt when provided', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: 'Response with system prompt'
            }
          }]
        }
      });

      mockedAxios.create.mockReturnValue({
        post: mockPost
      } as any);

      await generateChatCompletionDirect(
        validOverrides,
        'Hello',
        [],
        'You are a helpful assistant'
      );

      expect(mockPost).toHaveBeenCalledWith('/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' }
        ]
      });
    });

    it('ignores empty system prompt', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: 'Response without system prompt'
            }
          }]
        }
      });

      mockedAxios.create.mockReturnValue({
        post: mockPost
      } as any);

      await generateChatCompletionDirect(
        validOverrides,
        'Hello',
        [],
        '   ' // whitespace only
      );

      expect(mockPost).toHaveBeenCalledWith('/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      });
    });

    it('handles history messages correctly', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: 'Response with history'
            }
          }]
        }
      });

      mockedAxios.create.mockReturnValue({
        post: mockPost
      } as any);

      const historyMessages = [
        {
          getText: () => 'Previous message 1',
          role: 'user'
        },
        {
          getText: () => 'Previous message 2',
          role: 'assistant'
        }
      ] as any;

      await generateChatCompletionDirect(
        validOverrides,
        'Current message',
        historyMessages
      );

      expect(mockPost).toHaveBeenCalledWith('/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Previous message 1' },
          { role: 'assistant', content: 'Previous message 2' },
          { role: 'user', content: 'Current message' }
        ]
      });
    });

    it('handles malformed history messages gracefully', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: 'Response with malformed history'
            }
          }]
        }
      });

      mockedAxios.create.mockReturnValue({
        post: mockPost
      } as any);

      const historyMessages = [
        {
          getText: () => { throw new Error('Malformed message'); },
          role: 'user'
        },
        {
          getText: () => 'Valid message',
          role: 'assistant'
        }
      ] as any;

      await generateChatCompletionDirect(
        validOverrides,
        'Current message',
        historyMessages
      );

      // Should only include the valid message
      expect(mockPost).toHaveBeenCalledWith('/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'assistant', content: 'Valid message' },
          { role: 'user', content: 'Current message' }
        ]
      });
    });

    it('handles messages without explicit role (defaults to user)', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: 'Response with default role'
            }
          }]
        }
      });

      mockedAxios.create.mockReturnValue({
        post: mockPost
      } as any);

      const historyMessages = [
        {
          getText: () => 'Message without role',
          // No role property
        }
      ] as any;

      await generateChatCompletionDirect(
        validOverrides,
        'Current message',
        historyMessages
      );

      expect(mockPost).toHaveBeenCalledWith('/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Message without role' },
          { role: 'user', content: 'Current message' }
        ]
      });
    });

    it('returns empty string when response has no content', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: ''
            }
          }]
        }
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const result = await generateChatCompletionDirect(
        validOverrides,
        'test message'
      );

      expect(result).toBe('');
    });

    it('returns empty string when response has no choices', async () => {
      const mockResponse = {
        data: {}
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const result = await generateChatCompletionDirect(
        validOverrides,
        'test message'
      );

      expect(result).toBe('');
    });

    it('returns empty string when response choices is empty array', async () => {
      const mockResponse = {
        data: {
          choices: []
        }
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const result = await generateChatCompletionDirect(
        validOverrides,
        'test message'
      );

      expect(result).toBe('');
    });

    it('throws error on axios request failure', async () => {
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue(new Error('Network error'))
      } as any);

      await expect(generateChatCompletionDirect(
        validOverrides,
        'test message'
      )).rejects.toThrow('OpenWebUI direct request failed');
    });

    it('handles axios error with message property', async () => {
      const axiosError = new Error('Connection timeout');
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue(axiosError)
      } as any);

      await expect(generateChatCompletionDirect(
        validOverrides,
        'test message'
      )).rejects.toThrow('OpenWebUI direct request failed');
    });

    it('handles non-Error axios rejection', async () => {
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue('String error')
      } as any);

      await expect(generateChatCompletionDirect(
        validOverrides,
        'test message'
      )).rejects.toThrow('OpenWebUI direct request failed');
    });

    it('handles null response data', async () => {
      const mockResponse = {
        data: null
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const result = await generateChatCompletionDirect(
        validOverrides,
        'test message'
      );

      expect(result).toBe('');
    });

    it('handles undefined response data', async () => {
      const mockResponse = {};

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const result = await generateChatCompletionDirect(
        validOverrides,
        'test message'
      );

      expect(result).toBe('');
    });
  });
});