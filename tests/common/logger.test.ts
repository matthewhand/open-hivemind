/**
 * @fileoverview Tests for the Logger utility module
 * @module tests/common/logger.test
 */

import Logger from '../../src/common/logger';

// Don't mock the entire module, just spy on console methods

// Mock console methods
const mockConsoleInfo = jest.fn();
const mockConsoleError = jest.fn();
const mockConsoleWarn = jest.fn();

// Save original console methods
const originalConsoleInfo = console.info;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('Logger', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock console methods
    console.info = mockConsoleInfo;
    console.error = mockConsoleError;
    console.warn = mockConsoleWarn;
  });

  afterEach(() => {
    // Restore original console methods
    console.info = originalConsoleInfo;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  afterAll(() => {
    // Ensure console methods are restored
    console.info = originalConsoleInfo;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  describe('info method', () => {
    it('should log a single string message', () => {
      const message = 'Test info message';
      Logger.info(message);
      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      expect(mockConsoleInfo).toHaveBeenCalledWith(message);
    });

    it('should log multiple string arguments', () => {
      const message1 = 'First message';
      const message2 = 'Second message';
      Logger.info(message1, message2);
      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      expect(mockConsoleInfo).toHaveBeenCalledWith(message1, message2);
    });

    it('should sanitize objects in log arguments', () => {
      const sensitiveData = {
        apiKey: 'sk-1234567890abcdef',
        password: 'secret_password',
        user: 'test_user',
      };

      Logger.info('Sensitive data:', sensitiveData);

      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      const args = mockConsoleInfo.mock.calls[0];
      expect(args[0]).toBe('Sensitive data:');
      expect(args[1]).toEqual({
        apiKey: 'sk-1***********cdef',
        password: 'secr*******word',
        user: 'test_user',
      });
    });

    it('should handle complex nested objects', () => {
      const nested = {
        level1: {
          level2: {
            token: 'secret-token',
            data: 'public-data',
          },
        },
      };

      Logger.info(nested);

      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      expect(mockConsoleInfo).toHaveBeenCalledWith({
        level1: {
          level2: {
            token: 'secr****oken',
            data: 'public-data',
          },
        },
      });
    });
  });

  describe('error method', () => {
    it('should log a single error message', () => {
      const message = 'Test error message';
      Logger.error(message);
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(message);
    });

    it('should log multiple string arguments', () => {
      const message1 = 'Error occurred';
      const message2 = 'Details here';
      Logger.error(message1, message2);
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(message1, message2);
    });

    it.each([
      {
        args: ['message', { key: 'value' }],
        expected: ['message', { key: 'value' }],
        description: 'string and object',
      },
      {
        args: [1, true, null],
        expected: [1, true, null],
        description: 'primitive values',
      },
      {
        args: [null, undefined],
        expected: [null, undefined],
        description: 'null and undefined values',
      },
    ])('should log $description correctly', ({ args, expected }) => {
      Logger.error(...args);
      expect(mockConsoleError).toHaveBeenCalledWith(...expected);
    });

    it('should sanitize Error objects', () => {
      const errorMessage = 'Something went wrong';
      const error = new Error('Test error');

      Logger.error(errorMessage, error);

      expect(mockConsoleError).toHaveBeenCalledWith(errorMessage, {
        name: 'Error',
        message: 'Test error',
        stack: expect.stringContaining('Error: Test error'),
      });

      const complexError = new Error('Validation failed');
      complexError.stack = 'Error: Validation failed\n    at validateUser (user.ts:45:15)';

      Logger.error('Validation error:', complexError);

      expect(mockConsoleError).toHaveBeenCalledWith('Validation error:', {
        name: 'Error',
        message: 'Validation failed',
        stack: 'Error: Validation failed\n    at validateUser (user.ts:45:15)',
      });
    });
  });

  describe('default export', () => {
    it('should export the Logger object as default', () => {
      // Import the default export
      const DefaultLogger = require('../../src/common/logger').default;

      expect(DefaultLogger).toBeDefined();
      expect(DefaultLogger.info).toBeDefined();
      expect(DefaultLogger.error).toBeDefined();
      expect(DefaultLogger.withContext).toBeDefined();
      expect(typeof DefaultLogger.info).toBe('function');
      expect(typeof DefaultLogger.error).toBe('function');
      expect(typeof DefaultLogger.withContext).toBe('function');
    });

    it('should have the same functionality through default export', () => {
      const DefaultLogger = require('../../src/common/logger').default;

      DefaultLogger.info('Test default export');

      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      expect(mockConsoleInfo).toHaveBeenCalledWith('Test default export');
    });
  });

  describe('console method binding', () => {
    it('should properly bind to console.info for info method', () => {
      const spy = jest.spyOn(console, 'info');

      Logger.info('Test binding');

      expect(spy).toHaveBeenCalledWith('Test binding');

      spy.mockRestore();
    });

    it('should properly bind to console.error for error method', () => {
      const spy = jest.spyOn(console, 'error');

      Logger.error('Test binding');

      expect(spy).toHaveBeenCalledWith('Test binding');

      spy.mockRestore();
    });
  });
});
