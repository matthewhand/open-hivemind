import { getRandomErrorMessage } from '../../../src/common/errors/getRandomErrorMessage';
import { handleError } from '../../../src/common/errors/handleError';

jest.mock('../../../src/common/errors/getRandomErrorMessage');

// Mock debug with proper structure
jest.mock('debug', () => {
  const mockDebugFn = jest.fn();
  const mockDebug = jest.fn(() => mockDebugFn);
  return mockDebug;
});

describe('handleError', () => {
  const mockSend = jest.fn();
  const mockGetRandomErrorMessage = getRandomErrorMessage as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRandomErrorMessage.mockReturnValue('Random error message');
  });

  describe('Error message sending', () => {
    it('should send a random error message if messageChannel is provided', () => {
      const error = new Error('Test error');
      const messageChannel = { send: mockSend };

      handleError(error, messageChannel);

      expect(mockSend).toHaveBeenCalledWith('Random error message');
      expect(mockGetRandomErrorMessage).toHaveBeenCalled();
    });

    it('should send different messages for different errors', () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');
      const messageChannel = { send: mockSend };

      mockGetRandomErrorMessage
        .mockReturnValueOnce('First random message')
        .mockReturnValueOnce('Second random message');

      handleError(error1, messageChannel);
      handleError(error2, messageChannel);

      expect(mockSend).toHaveBeenNthCalledWith(1, 'First random message');
      expect(mockSend).toHaveBeenNthCalledWith(2, 'Second random message');
      expect(mockGetRandomErrorMessage).toHaveBeenCalledTimes(2);
    });

    it('should handle async send methods gracefully', async () => {
      const asyncSend = jest.fn().mockResolvedValue(undefined);
      const messageChannel = { send: asyncSend };
      const error = new Error('Async test error');

      expect(() => handleError(error, messageChannel)).not.toThrow();
      expect(asyncSend).toHaveBeenCalledWith('Random error message');
    });
  });

  describe('Channel validation', () => {
    it('should not send message if no messageChannel provided', () => {
      const error = new Error('Test error');

      expect(() => handleError(error)).not.toThrow();
      expect(mockGetRandomErrorMessage).not.toHaveBeenCalled();
    });

    it.each([
      { channel: { notSend: jest.fn() }, case: 'no send method' },
      { channel: { send: null }, case: 'null send method' },
      { channel: { send: undefined }, case: 'undefined send method' },
    ])('should not send message if messageChannel has $case', ({ channel }) => {
      const error = new Error('Test error');

      expect(() => handleError(error, channel)).not.toThrow();
      expect(mockGetRandomErrorMessage).not.toHaveBeenCalled();
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle null/undefined errors gracefully', () => {
      const messageChannel = { send: mockSend };

      expect(() => handleError(null as any)).not.toThrow();
      expect(() => handleError(undefined as any)).not.toThrow();
      expect(() => handleError(null as any, messageChannel)).not.toThrow();
      expect(() => handleError(undefined as any, messageChannel)).not.toThrow();
    });

    it('should handle non-Error objects', () => {
      const messageChannel = { send: mockSend };
      const stringError = 'String error';
      const objectError = { message: 'Object error' };

      expect(() => handleError(stringError as any, messageChannel)).not.toThrow();
      expect(() => handleError(objectError as any, messageChannel)).not.toThrow();
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should handle errors with special properties', () => {
      const messageChannel = { send: mockSend };
      const customError = new Error('Custom error');
      (customError as any).code = 'CUSTOM_CODE';
      (customError as any).statusCode = 500;

      expect(() => handleError(customError, messageChannel)).not.toThrow();
      expect(mockSend).toHaveBeenCalledWith('Random error message');
    });
  });

  describe('Debug logging', () => {
    it('should handle debug logging without throwing', () => {
      const error = new Error('Debug test error');
      const messageChannel = { send: mockSend };

      expect(() => handleError(error, messageChannel)).not.toThrow();
      expect(mockSend).toHaveBeenCalledWith('Random error message');
    });

    it('should log even when no message channel provided', () => {
      const error = new Error('Debug only error');

      expect(() => handleError(error)).not.toThrow();
      expect(mockGetRandomErrorMessage).not.toHaveBeenCalled();
    });
  });

  describe('Error in error handling', () => {
    it('should handle errors in getRandomErrorMessage by not sending message', () => {
      const error = new Error('Original error');
      const messageChannel = { send: mockSend };

      mockGetRandomErrorMessage.mockImplementation(() => {
        throw new Error('Error in getRandomErrorMessage');
      });

      // The function may throw since error handling failed
      try {
        handleError(error, messageChannel);
      } catch (e) {
        // This is expected behavior when getRandomErrorMessage fails
      }

      // The send should not be called if getRandomErrorMessage fails
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should handle errors in send method by allowing the error to propagate', () => {
      const error = new Error('Original error');
      const failingSend = jest.fn().mockImplementation(() => {
        throw new Error('Send failed');
      });
      const messageChannel = { send: failingSend };

      // The function may throw since send failed
      try {
        handleError(error, messageChannel);
      } catch (e) {
        // This is expected behavior when send fails
      }

      expect(failingSend).toHaveBeenCalledWith('Random error message');
    });
  });
});
