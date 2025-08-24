/**
 * @fileoverview Tests for the Logger utility module
 * @module tests/common/logger.test
 */

import { Logger } from '../../src/common/logger';

// Mock console methods
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();
const mockConsoleWarn = jest.fn();

// Save original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Mock debug module
jest.mock('debug', () => {
  const mockDebug = jest.fn();
  mockDebug.enabled = true;
  return jest.fn(() => mockDebug);
});

describe('Logger', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock console methods
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    console.warn = mockConsoleWarn;
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  afterAll(() => {
    // Ensure console methods are restored
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  describe('Logger.create method', () => {
    it('should create a logger instance with debug, info, warn, and error methods', () => {
      const logger = Logger.create('test:namespace');
      
      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should create logger instances with different namespaces', () => {
      const logger1 = Logger.create('app:service1');
      const logger2 = Logger.create('app:service2');
      
      expect(logger1).toBeDefined();
      expect(logger2).toBeDefined();
      expect(logger1).not.toBe(logger2);
    });
  });

  describe('legacy info method', () => {
    it('should log a single string message', () => {
      const message = 'Test info message';
      
      Logger.info(message);
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\]/),
        message
      );
    });

    it('should log multiple string arguments', () => {
      const message1 = 'First message';
      const message2 = 'Second message';
      
      Logger.info(message1, message2);
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\]/),
        message1,
        message2
      );
    });

    it('should handle empty arguments', () => {
      Logger.info();
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\]/)
      );
    });
  });

  describe('legacy error method', () => {
    it('should log a single string error message', () => {
      const errorMessage = 'Test error message';
      
      Logger.error(errorMessage);
      
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\]/),
        errorMessage
      );
    });

    it('should log multiple string arguments', () => {
      const error1 = 'Error occurred:';
      const error2 = 'Database connection failed';
      
      Logger.error(error1, error2);
      
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\]/),
        error1,
        error2
      );
    });

    it('should handle empty arguments', () => {
      Logger.error();
      
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\]/)
      );
    });
  });

  describe('logger instance methods', () => {
    let logger: any;

    beforeEach(() => {
      logger = Logger.create('test:logger');
    });

    it('should have info method that logs with timestamp and namespace', () => {
      const message = 'Test info message';
      
      logger.info(message);
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] \[test:logger\]/),
        message
      );
    });

    it('should have error method that logs with timestamp and namespace', () => {
      const errorMessage = 'Test error message';
      
      logger.error(errorMessage);
      
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\] \[test:logger\]/),
        errorMessage
      );
    });

    it('should have warn method that logs with timestamp and namespace', () => {
      const warnMessage = 'Test warn message';
      
      logger.warn(warnMessage);
      
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[WARN\] \[test:logger\]/),
        warnMessage
      );
    });
  });

  describe('default export', () => {
    it('should export the Logger object as default', () => {
      // Import the default export
      const DefaultLogger = require('../../src/common/logger').default;
      
      expect(DefaultLogger).toBeDefined();
      expect(DefaultLogger.info).toBeDefined();
      expect(DefaultLogger.error).toBeDefined();
      expect(DefaultLogger.create).toBeDefined();
      expect(typeof DefaultLogger.info).toBe('function');
      expect(typeof DefaultLogger.error).toBe('function');
      expect(typeof DefaultLogger.create).toBe('function');
    });

    it('should have the same functionality through default export', () => {
      const DefaultLogger = require('../../src/common/logger').default;
      
      DefaultLogger.info('Test default export');
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\]/),
        'Test default export'
      );
    });
  });

  describe('console method binding', () => {
    it('should properly bind to console.log for info method', () => {
      const spy = jest.spyOn(console, 'log');
      
      Logger.info('Test binding');
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\]/),
        'Test binding'
      );
      
      spy.mockRestore();
    });

    it('should properly bind to console.error for error method', () => {
      const spy = jest.spyOn(console, 'error');
      
      Logger.error('Test binding');
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\]/),
        'Test binding'
      );
      
      spy.mockRestore();
    });
  });
});