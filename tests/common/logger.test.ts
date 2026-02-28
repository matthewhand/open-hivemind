/**
 * @fileoverview Tests for the Logger utility module
 * @module tests/common/logger.test
 */

import Logger from '../../src/common/logger';

// Don't mock the entire module, just spy on console methods

// Mock console methods
const mockConsoleInfo = jest.fn();
const mockConsoleError = jest.fn();

// Save original console methods
const originalConsoleInfo = console.info;
const originalConsoleError = console.error;

describe('Logger', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock console methods
    console.info = mockConsoleInfo;
    console.error = mockConsoleError;
  });

  afterEach(() => {
    // Restore original console methods
    console.info = originalConsoleInfo;
    console.error = originalConsoleError;
  });

  afterAll(() => {
    // Ensure console methods are restored
    console.info = originalConsoleInfo;
    console.error = originalConsoleError;
  });

  describe('info method', () => {
    test.each([
      {
        args: ['Test info message'],
        expected: ['Test info message'],
        description: 'single string message',
      },
      {
        args: ['First message', 'Second message'],
        expected: ['First message', 'Second message'],
        description: 'multiple string messages',
      },
      {
        args: ['User data:', { id: 123, name: 'John Doe' }],
        expected: ['User data:', { id: 123, name: 'John Doe' }],
        description: 'string with object',
      },
      {
        args: ['Processing request', 42, { status: 'success' }, [1, 2, 3]],
        expected: ['Processing request', 42, { status: 'success' }, [1, 2, 3]],
        description: 'mixed argument types',
      },
      { args: [], expected: [], description: 'empty arguments' },
      {
        args: [null, undefined],
        expected: [null, undefined],
        description: 'null and undefined values',
      },
    ])('should log $description correctly', ({ args, expected }) => {
      Logger.info(...args);
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\]$/),
        ...expected
      );
    });
  });

  describe('error method', () => {
    test.each([
      {
        args: ['Test error message'],
        expected: ['Test error message'],
        description: 'single string message',
      },
      {
        args: ['Error occurred:', 'Database connection failed'],
        expected: ['Error occurred:', 'Database connection failed'],
        description: 'multiple string messages',
      },
      {
        args: [
          'Failed to save user:',
          { operation: 'save', entity: 'user' },
          { code: 500, message: 'Internal server error' },
        ],
        expected: [
          'Failed to save user:',
          { operation: 'save', entity: 'user' },
          { code: 500, message: 'Internal server error' },
        ],
        description: 'complex error with objects',
      },
      { args: [], expected: [], description: 'empty arguments' },
      {
        args: [null, undefined],
        expected: [null, undefined],
        description: 'null and undefined values',
      },
    ])('should log $description correctly', ({ args, expected }) => {
      Logger.error(...args);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\]$/),
        ...expected
      );
    });

    it('should sanitize Error objects', () => {
      const errorMessage = 'Something went wrong';
      const error = new Error('Test error');

      Logger.error(errorMessage, error);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\]$/),
        errorMessage, {
        name: 'Error',
        message: 'Test error',
        stack: expect.stringContaining('Error: Test error'),
      });

      const complexError = new Error('Validation failed');
      complexError.stack = 'Error: Validation failed\n    at validateUser (user.ts:45:15)';

      Logger.error('Validation error:', complexError);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\]$/),
        'Validation error:', {
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
      expect(typeof DefaultLogger.info).toBe('function');
      expect(typeof DefaultLogger.error).toBe('function');
    });

    it('should have the same functionality through default export', () => {
      const DefaultLogger = require('../../src/common/logger').default;

      DefaultLogger.info('Test default export');

      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\]$/),
        'Test default export'
      );
    });
  });

  describe('console method binding', () => {
    it('should properly bind to console.info for info method', () => {
      const spy = jest.spyOn(console, 'info');

      Logger.info('Test binding');

      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\]$/),
        'Test binding'
      );

      spy.mockRestore();
    });

    it('should properly bind to console.error for error method', () => {
      const spy = jest.spyOn(console, 'error');

      Logger.error('Test binding');

      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\]$/),
        'Test binding'
      );

      spy.mockRestore();
    });
  });
});
