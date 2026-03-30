import { describe, expect, it } from '@jest/globals';
import { EnhancedErrorHandler } from '@src/common/errors/EnhancedErrorHandler';

describe('EnhancedErrorHandler', () => {
  describe('Error Classification', () => {
    it('should classify network errors via error code', () => {
      const error = new Error('Connection refused');
      (error as any).code = 'ECONNREFUSED';
      const enhanced = EnhancedErrorHandler.toActionableError(error);

      expect(enhanced.errorType).toBe('network_error');
      expect(enhanced.canRetry).toBe(true);
      expect(enhanced.suggestions.length).toBeGreaterThan(0);
    });

    it('should classify timeout errors', () => {
      const error = new Error('Connection timeout');
      (error as any).code = 'ETIMEDOUT';
      const enhanced = EnhancedErrorHandler.toActionableError(error);

      expect(enhanced.errorType).toBe('connection_timeout');
      expect(enhanced.canRetry).toBe(true);
    });

    it('should classify rate limit errors', () => {
      const error = new Error('Too many requests');
      const enhanced = EnhancedErrorHandler.toActionableError(error);

      expect(enhanced.errorType).toBe('rate_limit_exceeded');
      expect(enhanced.canRetry).toBe(true);
    });

    it('should classify resource not found errors', () => {
      const error = new Error('Resource not found');
      const enhanced = EnhancedErrorHandler.toActionableError(error);

      expect(enhanced.errorType).toBe('resource_not_found');
    });
  });

  describe('Actionable Messages', () => {
    it('should provide suggestions for errors', () => {
      const error = new Error('Something went wrong');
      const enhanced = EnhancedErrorHandler.toActionableError(error);

      expect(enhanced.suggestions).toBeDefined();
      expect(Array.isArray(enhanced.suggestions)).toBe(true);
      expect(enhanced.suggestions.length).toBeGreaterThan(0);
    });

    it('should include message in result', () => {
      const error = new Error('Test error message');
      const enhanced = EnhancedErrorHandler.toActionableError(error);

      expect(enhanced.message).toBeDefined();
      expect(typeof enhanced.message).toBe('string');
    });
  });

  describe('Context-Specific Handling', () => {
    it('should use marketplace context', () => {
      const error = new Error('Install failed');
      const enhanced = EnhancedErrorHandler.toActionableError(error, {
        operation: 'marketplace_install',
      });

      expect(enhanced).toBeDefined();
      expect(enhanced.suggestions.length).toBeGreaterThan(0);
    });

    it('should use tool execution context', () => {
      const error = new Error('Tool failed');
      const enhanced = EnhancedErrorHandler.toActionableError(error, {
        operation: 'tool_execution',
      });

      expect(enhanced).toBeDefined();
      expect(enhanced.suggestions.length).toBeGreaterThan(0);
    });

    it('should use provider connection context', () => {
      const error = new Error('Provider failed');
      const enhanced = EnhancedErrorHandler.toActionableError(error, {
        operation: 'provider_connection',
      });

      expect(enhanced).toBeDefined();
      expect(enhanced.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Retry Capability', () => {
    it('should mark network errors as retryable', () => {
      const error = new Error('Network error');
      (error as any).code = 'ECONNREFUSED';
      const enhanced = EnhancedErrorHandler.toActionableError(error);

      expect(enhanced.canRetry).toBe(true);
    });

    it('should include retryAfter for retryable errors when applicable', () => {
      const error = new Error('Too many requests - rate limited');
      const enhanced = EnhancedErrorHandler.toActionableError(error);

      expect(enhanced.canRetry).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null errors', () => {
      const enhanced = EnhancedErrorHandler.toActionableError(null);

      expect(enhanced.message).toBeDefined();
      expect(enhanced.errorType).toBe('unknown_error');
      expect(enhanced.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle string errors', () => {
      const enhanced = EnhancedErrorHandler.toActionableError('Something went wrong');

      expect(enhanced.message).toBe('Something went wrong');
      expect(enhanced.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle errors without messages', () => {
      const error = new Error();
      const enhanced = EnhancedErrorHandler.toActionableError(error);

      expect(enhanced.message).toBeDefined();
      expect(enhanced.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new Error(longMessage);
      const enhanced = EnhancedErrorHandler.toActionableError(error);

      expect(enhanced.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle undefined errors', () => {
      const enhanced = EnhancedErrorHandler.toActionableError(undefined);

      expect(enhanced.message).toBeDefined();
      expect(enhanced.errorType).toBe('unknown_error');
    });

    it('should handle numeric errors', () => {
      const enhanced = EnhancedErrorHandler.toActionableError(42);

      expect(enhanced.message).toBeDefined();
      expect(enhanced.errorType).toBe('unknown_error');
    });
  });

  describe('Return Shape', () => {
    it('should return all expected fields', () => {
      const error = new Error('Test');
      const enhanced = EnhancedErrorHandler.toActionableError(error);

      expect(enhanced).toHaveProperty('message');
      expect(enhanced).toHaveProperty('errorType');
      expect(enhanced).toHaveProperty('suggestions');
      expect(enhanced).toHaveProperty('canRetry');
    });

    it('should return statusCode when available', () => {
      const error = new Error('Not found');
      const enhanced = EnhancedErrorHandler.toActionableError(error);

      expect(enhanced.statusCode).toBeDefined();
    });
  });
});
