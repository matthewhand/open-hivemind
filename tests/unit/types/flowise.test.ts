import {
  isFlowisePredictionResponse,
  isFlowiseSdkCompletion,
  isFlowiseError,
  isFlowiseApiError,
} from '../../../src/types/flowise';

describe('Flowise Type Guards', () => {
  describe('isFlowisePredictionResponse', () => {
    it('returns true for a valid FlowisePredictionResponse', () => {
      expect(isFlowisePredictionResponse({ text: 'Hello from Flowise' })).toBe(true);
    });

    it('returns true with additional properties', () => {
      expect(
        isFlowisePredictionResponse({ text: 'Hello', chatId: 'chat-123', chatMessageId: 'msg-456' })
      ).toBe(true);
    });

    it('returns false for null', () => {
      expect(isFlowisePredictionResponse(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isFlowisePredictionResponse(undefined)).toBe(false);
    });

    it('returns false when text is missing', () => {
      expect(isFlowisePredictionResponse({ chatId: 'chat-123' })).toBe(false);
    });

    it('returns false when text is not a string', () => {
      expect(isFlowisePredictionResponse({ text: 123 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isFlowisePredictionResponse('string')).toBe(false);
      expect(isFlowisePredictionResponse(42)).toBe(false);
      expect(isFlowisePredictionResponse(true)).toBe(false);
    });
  });

  describe('isFlowiseSdkCompletion', () => {
    it('returns true when text is present', () => {
      expect(isFlowiseSdkCompletion({ text: 'Hello' })).toBe(true);
    });

    it('returns true when error is present', () => {
      expect(isFlowiseSdkCompletion({ error: 'Something went wrong' })).toBe(true);
    });

    it('returns true when both text and error are present', () => {
      expect(isFlowiseSdkCompletion({ text: 'Hello', error: 'partial error' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isFlowiseSdkCompletion(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isFlowiseSdkCompletion(undefined)).toBe(false);
    });

    it('returns false when neither text nor error is present', () => {
      expect(isFlowiseSdkCompletion({ chatId: 'chat-123' })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isFlowiseSdkCompletion('string')).toBe(false);
      expect(isFlowiseSdkCompletion(42)).toBe(false);
      expect(isFlowiseSdkCompletion(true)).toBe(false);
    });
  });

  describe('isFlowiseError', () => {
    it('returns true for a valid FlowiseError', () => {
      expect(isFlowiseError({ message: 'Something failed' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isFlowiseError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isFlowiseError(undefined)).toBe(false);
    });

    it('returns false when message is missing', () => {
      expect(isFlowiseError({ code: 'ERR_001' })).toBe(false);
    });

    it('returns false when message is not a string', () => {
      expect(isFlowiseError({ message: 123 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isFlowiseError('string')).toBe(false);
      expect(isFlowiseError(42)).toBe(false);
      expect(isFlowiseError(true)).toBe(false);
    });
  });

  describe('isFlowiseApiError', () => {
    it('returns true for a valid FlowiseApiError', () => {
      expect(isFlowiseApiError({ error: 'Invalid API key' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isFlowiseApiError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isFlowiseApiError(undefined)).toBe(false);
    });

    it('returns false when error is missing', () => {
      expect(isFlowiseApiError({ message: 'Something failed' })).toBe(false);
    });

    it('returns false when error is not a string', () => {
      expect(isFlowiseApiError({ error: 123 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isFlowiseApiError('string')).toBe(false);
      expect(isFlowiseApiError(42)).toBe(false);
      expect(isFlowiseApiError(true)).toBe(false);
    });
  });
});
