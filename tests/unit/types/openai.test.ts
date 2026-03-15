import {
  isOpenAIError,
  isChatCompletionResponse,
  isModelsListResponse,
  isCompletionResponse,
  OpenAIResponse,
} from '../../../src/types/openai';

describe('OpenAI Type Guards', () => {
  describe('isOpenAIError', () => {
    it('returns true when error is present', () => {
      const response = {
        object: 'error',
        error: { message: 'Some error', type: 'invalid_request_error' },
      } as OpenAIResponse;
      expect(isOpenAIError(response)).toBe(true);
    });

    it('returns false when error is not present', () => {
      const response = {
        object: 'chat.completion',
        created: 1234567890,
      } as OpenAIResponse;
      expect(isOpenAIError(response)).toBe(false);
    });

    it('returns false when error is explicitly null', () => {
      const response = { object: 'chat.completion', error: null } as any as OpenAIResponse;
      expect(isOpenAIError(response)).toBe(false);
    });
  });

  describe('isChatCompletionResponse', () => {
    it('returns true when object is chat.completion', () => {
      const response = {
        object: 'chat.completion',
        created: 1234567890,
        id: 'chatcmpl-123',
        model: 'gpt-3.5-turbo',
        choices: [],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      } as OpenAIResponse;
      expect(isChatCompletionResponse(response)).toBe(true);
    });

    it('returns false when object is not chat.completion', () => {
      const response = {
        object: 'text_completion',
      } as OpenAIResponse;
      expect(isChatCompletionResponse(response)).toBe(false);
    });

    it('returns false when object property is missing', () => {
      const response = {
        created: 1234567890,
      } as any as OpenAIResponse;
      expect(isChatCompletionResponse(response)).toBe(false);
    });
  });

  describe('isModelsListResponse', () => {
    it('returns true for a valid models list response', () => {
      const response = {
        object: 'list',
        created: 1234567890,
        data: [{ id: 'model-1', object: 'model', created: 123456, owned_by: 'openai' }],
      } as OpenAIResponse;
      expect(isModelsListResponse(response)).toBe(true);
    });

    it('returns false when object is not list', () => {
      const response = {
        object: 'chat.completion',
        data: [{ id: 'model-1' }],
      } as any as OpenAIResponse;
      expect(isModelsListResponse(response)).toBe(false);
    });

    it('returns false when data is missing', () => {
      const response = {
        object: 'list',
      } as any as OpenAIResponse;
      expect(isModelsListResponse(response)).toBe(false);
    });

    it('returns false when data is not an array', () => {
      const response = {
        object: 'list',
        data: 'not an array',
      } as any as OpenAIResponse;
      expect(isModelsListResponse(response)).toBe(false);
    });

    it('returns false when data array is empty', () => {
      const response = {
        object: 'list',
        data: [],
      } as any as OpenAIResponse;
      expect(isModelsListResponse(response)).toBe(false);
    });

    it('returns false when first element of data is missing id', () => {
      const response = {
        object: 'list',
        data: [{ object: 'model' }],
      } as any as OpenAIResponse;
      expect(isModelsListResponse(response)).toBe(false);
    });
  });

  describe('isCompletionResponse', () => {
    it('returns true when object is text_completion', () => {
      const response = {
        object: 'text_completion',
        created: 1234567890,
        model: 'text-davinci-003',
        choices: [],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      } as OpenAIResponse;
      expect(isCompletionResponse(response)).toBe(true);
    });

    it('returns false when object is not text_completion', () => {
      const response = {
        object: 'chat.completion',
      } as OpenAIResponse;
      expect(isCompletionResponse(response)).toBe(false);
    });

    it('returns false when object property is missing', () => {
      const response = {
        created: 1234567890,
      } as any as OpenAIResponse;
      expect(isCompletionResponse(response)).toBe(false);
    });
  });
});
