/**
 * @fileoverview Tests for the Logger utility module
 * @module tests/common/logger.test
 */

import { Logger } from '../../src/common/logger';

// Mock the logger module to control console methods
jest.mock('../../src/common/logger', () => {
  const originalModule = jest.requireActual('../../src/common/logger');
  return {
    ...originalModule,
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  };
});

// Mock console methods
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();

// Save original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Logger', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock console methods
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  afterAll(() => {
    // Ensure console methods are restored
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('info method', () => {
    it('should log a single string message', () => {
      const message = 'Test info message';
      
      Logger.info(message);
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(message);
    });

    it('should log multiple string arguments', () => {
      const message1 = 'First message';
      const message2 = 'Second message';
      
      Logger.info(message1, message2);
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(message1, message2);
    });

    it('should log object arguments', () => {
      const message = 'User data:';
      const userData = { id: 123, name: 'John Doe' };
      
      Logger.info(message, userData);
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(message, userData);
    });

    it('should log mixed types of arguments', () => {
      const stringArg = 'Processing request';
      const numberArg = 42;
      const objectArg = { status: 'success' };
      const arrayArg = [1, 2, 3];
      
      Logger.info(stringArg, numberArg, objectArg, arrayArg);
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(stringArg, numberArg, objectArg, arrayArg);
    });

    it('should handle empty arguments', () => {
      Logger.info();
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith();
    });

    it('should handle null and undefined values', () => {
      Logger.info(null, undefined);
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(null, undefined);
    });
  });

  describe('error method', () => {
    it('should log a single string error message', () => {
      const errorMessage = 'Test error message';
      
      Logger.error(errorMessage);
      
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(errorMessage);
    });

    it('should log multiple string arguments', () => {
      const error1 = 'Error occurred:';
      const error2 = 'Database connection failed';
      
      Logger.error(error1, error2);
      
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(error1, error2);
    });

    it('should log Error objects', () => {
      const errorMessage = 'Something went wrong';
      const error = new Error('Test error');
      
      Logger.error(errorMessage, error);
      
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(errorMessage, error);
    });

    it('should log object arguments', () => {
      const context = { operation: 'save', entity: 'user' };
      const errorDetails = { code: 500, message: 'Internal server error' };
      
      Logger.error('Failed to save user:', context, errorDetails);
      
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to save user:', context, errorDetails);
    });

    it('should handle empty arguments', () => {
      Logger.error();
      
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith();
    });

    it('should handle null and undefined values', () => {
      Logger.error(null, undefined);
      
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(null, undefined);
    });

    it('should log complex error objects', () => {
      const error = new Error('Validation failed');
      error.stack = 'Error: Validation failed\n    at validateUser (user.ts:45:15)';
      
      Logger.error('Validation error:', error);
      
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith('Validation error:', error);
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
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith('Test default export');
    });
  });

  describe('console method binding', () => {
    it('should properly bind to console.log for info method', () => {
      const spy = jest.spyOn(console, 'log');
      
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