import {
  isOpenAIError,
  isChatCompletionResponse,
  isModelsListResponse,
  isCompletionResponse,
  OpenAIResponse,
} from '../../../src/types/openai';

describe('OpenAI Type Guards', () => {
  describe('isOpenAIError', () => {
    it('should return true for a valid OpenAIError object', () => {
      const errorResponse: OpenAIResponse = {
        object: 'error',
        error: {
          message: 'Invalid API key',
          type: 'invalid_request_error',
        },
      };
      expect(isOpenAIError(errorResponse)).toBe(true);
    });

    it('should return false when error property is missing', () => {
      const response = {
        object: 'chat.completion',
        id: '123',
      } as any;
      expect(isOpenAIError(response)).toBe(false);
    });

    it('should return false when error property is null', () => {
      const response = {
        object: 'error',
        error: null,
      } as any;
      expect(isOpenAIError(response)).toBe(false);
    });

    it('should return false when error property is undefined', () => {
      const response = {
        object: 'error',
        error: undefined,
      } as any;
      expect(isOpenAIError(response)).toBe(false);
    });

    it('should return false for other valid response types', () => {
      const chatResponse: OpenAIResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-3.5-turbo-0613',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello!',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 9,
          completion_tokens: 12,
          total_tokens: 21,
        },
      };
      expect(isOpenAIError(chatResponse)).toBe(false);
    });
  });

  describe('isChatCompletionResponse', () => {
    it('should return true for a valid ChatCompletionResponse', () => {
      const response: OpenAIResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 123456789,
        model: 'gpt-4',
        choices: [],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
      expect(isChatCompletionResponse(response)).toBe(true);
    });

    it('should return false for an Error response', () => {
      const response: OpenAIResponse = {
        object: 'error',
        error: { message: 'err', type: 'type' },
      };
      expect(isChatCompletionResponse(response)).toBe(false);
    });
  });

  describe('isModelsListResponse', () => {
    it('should return true for a valid ModelsListResponse with data', () => {
      const response: OpenAIResponse = {
        object: 'list',
        created: 123456789,
        data: [
          {
            id: 'gpt-4',
            object: 'model',
            created: 123456789,
            owned_by: 'openai',
          },
        ],
      };
      expect(isModelsListResponse(response)).toBe(true);
    });

    it('should return true for an empty ModelsListResponse', () => {
      const response: OpenAIResponse = {
        object: 'list',
        created: 123456789,
        data: [],
      };
      expect(isModelsListResponse(response)).toBe(true);
    });

    it('should return false if object is not list', () => {
      const response: any = {
        object: 'not-list',
        data: [{ id: 'model-1' }],
      };
      expect(isModelsListResponse(response)).toBe(false);
    });
  });

  describe('isCompletionResponse', () => {
    it('should return true for a valid CompletionResponse', () => {
      const response: OpenAIResponse = {
        id: 'cmpl-123',
        object: 'text_completion',
        created: 123456789,
        model: 'text-davinci-003',
        choices: [],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
      expect(isCompletionResponse(response)).toBe(true);
    });

    it('should return false for other response types', () => {
      const response: any = {
        object: 'chat.completion',
      };
      expect(isCompletionResponse(response)).toBe(false);
    });
  });
});
