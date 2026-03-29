import { describe, it, expect } from '@jest/globals';
import { EnhancedErrorHandler } from '@src/common/errors/EnhancedErrorHandler';

describe('EnhancedErrorHandler', () => {
  describe('Error Classification', () => {
    it('should classify network errors', () => {
      const error = new Error('ECONNREFUSED');
      const enhanced = EnhancedErrorHandler.convertToActionableError(error, 'connection');

      expect(enhanced.errorType).toBe('network');
      expect(enhanced.canRetry).toBe(true);
      expect(enhanced.message).toContain('connection');
    });

    it('should classify authentication errors', () => {
      const error = new Error('Unauthorized');
      (error as any).status = 401;
      const enhanced = EnhancedErrorHandler.convertToActionableError(error, 'authentication');

      expect(enhanced.errorType).toBe('authentication');
      expect(enhanced.canRetry).toBe(false);
      expect(enhanced.suggestions).toContain('Check that your API key or credentials are correct');
    });

    it('should classify validation errors', () => {
      const error = new Error('Invalid input');
      (error as any).status = 400;
      const enhanced = EnhancedErrorHandler.convertToActionableError(error, 'validation');

      expect(enhanced.errorType).toBe('validation');
      expect(enhanced.canRetry).toBe(false);
    });

    it('should classify rate limit errors', () => {
      const error = new Error('Too many requests');
      (error as any).status = 429;
      const enhanced = EnhancedErrorHandler.convertToActionableError(error, 'rate-limit');

      expect(enhanced.errorType).toBe('rate_limit');
      expect(enhanced.canRetry).toBe(true);
      expect(enhanced.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe('Actionable Messages', () => {
    it('should provide specific suggestions for git errors', () => {
      const error = new Error('fatal: repository not found');
      const enhanced = EnhancedErrorHandler.convertToActionableError(
        error,
        'marketplace',
        'install'
      );

      expect(enhanced.suggestions).toContain('Verify the GitHub repository URL is correct and accessible');
      expect(enhanced.suggestions).toContain('Check if the repository is public or you have access');
    });

    it('should provide specific suggestions for build failures', () => {
      const error = new Error('npm install failed');
      const enhanced = EnhancedErrorHandler.convertToActionableError(
        error,
        'marketplace',
        'install'
      );

      expect(enhanced.suggestions).toContain('Check if all dependencies are compatible');
      expect(enhanced.suggestions.some((s) => s.includes('package.json'))).toBe(true);
    });

    it('should provide specific suggestions for connection errors', () => {
      const error = new Error('Connection timeout');
      const enhanced = EnhancedErrorHandler.convertToActionableError(
        error,
        'mcp',
        'connect'
      );

      expect(enhanced.suggestions).toContain('Verify the MCP server URL is correct and reachable');
      expect(enhanced.suggestions).toContain('Check network connectivity and firewall settings');
    });

    it('should provide specific suggestions for tool execution errors', () => {
      const error = new Error('Tool execution failed');
      const enhanced = EnhancedErrorHandler.convertToActionableError(
        error,
        'mcp',
        'execute'
      );

      expect(enhanced.suggestions).toContain('Verify the tool parameters are correct');
      expect(enhanced.suggestions.some((s) => s.includes('required'))).toBe(true);
    });

    it('should provide specific suggestions for permission errors', () => {
      const error = new Error('Permission denied');
      (error as any).status = 403;
      const enhanced = EnhancedErrorHandler.convertToActionableError(
        error,
        'bot',
        'operation'
      );

      expect(enhanced.suggestions.some((s) => s.includes('permission'))).toBe(true);
      expect(enhanced.suggestions.some((s) => s.includes('access'))).toBe(true);
    });
  });

  describe('Retry Capability', () => {
    it('should mark network errors as retryable', () => {
      const error = new Error('ETIMEDOUT');
      const enhanced = EnhancedErrorHandler.convertToActionableError(error, 'network');

      expect(enhanced.canRetry).toBe(true);
      expect(enhanced.retryAfterSeconds).toBeGreaterThanOrEqual(0);
    });

    it('should mark validation errors as non-retryable', () => {
      const error = new Error('Invalid input');
      (error as any).status = 400;
      const enhanced = EnhancedErrorHandler.convertToActionableError(error, 'validation');

      expect(enhanced.canRetry).toBe(false);
    });

    it('should provide retry delay for rate limit errors', () => {
      const error = new Error('Rate limit exceeded');
      (error as any).status = 429;
      const enhanced = EnhancedErrorHandler.convertToActionableError(error, 'rate-limit');

      expect(enhanced.canRetry).toBe(true);
      expect(enhanced.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('should extract Retry-After header', () => {
      const error = new Error('Rate limit');
      (error as any).status = 429;
      (error as any).headers = { 'retry-after': '60' };
      const enhanced = EnhancedErrorHandler.convertToActionableError(error, 'rate-limit');

      expect(enhanced.retryAfterSeconds).toBe(60);
    });
  });

  describe('Documentation Links', () => {
    it('should include relevant documentation links', () => {
      const error = new Error('Configuration error');
      const enhanced = EnhancedErrorHandler.convertToActionableError(
        error,
        'configuration'
      );

      expect(enhanced.documentationUrl).toBeDefined();
      expect(enhanced.documentationUrl).toContain('http');
    });

    it('should provide context-specific documentation', () => {
      const mcpError = new Error('MCP error');
      const marketplaceError = new Error('Marketplace error');

      const mcpEnhanced = EnhancedErrorHandler.convertToActionableError(mcpError, 'mcp');
      const marketplaceEnhanced = EnhancedErrorHandler.convertToActionableError(
        marketplaceError,
        'marketplace'
      );

      expect(mcpEnhanced.documentationUrl).not.toBe(marketplaceEnhanced.documentationUrl);
    });
  });

  describe('Correlation IDs', () => {
    it('should generate unique correlation IDs', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      const enhanced1 = EnhancedErrorHandler.convertToActionableError(error1, 'test');
      const enhanced2 = EnhancedErrorHandler.convertToActionableError(error2, 'test');

      expect(enhanced1.correlationId).toBeDefined();
      expect(enhanced2.correlationId).toBeDefined();
      expect(enhanced1.correlationId).not.toBe(enhanced2.correlationId);
    });

    it('should format correlation ID consistently', () => {
      const error = new Error('Test error');
      const enhanced = EnhancedErrorHandler.convertToActionableError(error, 'test');

      expect(enhanced.correlationId).toMatch(/^ERR-[A-F0-9]{8}$/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined errors', () => {
      const enhanced = EnhancedErrorHandler.convertToActionableError(null, 'unknown');

      expect(enhanced.message).toBe('An unknown error occurred');
      expect(enhanced.errorType).toBe('unknown');
      expect(enhanced.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle errors without messages', () => {
      const error = new Error();
      const enhanced = EnhancedErrorHandler.convertToActionableError(error, 'unknown');

      expect(enhanced.message).toBeDefined();
      expect(enhanced.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle errors with stack traces', () => {
      const error = new Error('Test error');
      Error.captureStackTrace(error);
      const enhanced = EnhancedErrorHandler.convertToActionableError(error, 'test');

      expect(enhanced.originalError.stack).toBeDefined();
    });

    it('should handle nested error causes', () => {
      const rootCause = new Error('Root cause');
      const error = new Error('Top level error');
      (error as any).cause = rootCause;

      const enhanced = EnhancedErrorHandler.convertToActionableError(error, 'nested');

      expect(enhanced.message).toBeDefined();
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new Error(longMessage);
      const enhanced = EnhancedErrorHandler.convertToActionableError(error, 'test');

      // Should not crash and should provide suggestions
      expect(enhanced.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Context-Specific Handling', () => {
    it('should provide different suggestions for different contexts', () => {
      const error = new Error('Operation failed');

      const marketplaceContext = EnhancedErrorHandler.convertToActionableError(
        error,
        'marketplace'
      );
      const mcpContext = EnhancedErrorHandler.convertToActionableError(error, 'mcp');
      const botContext = EnhancedErrorHandler.convertToActionableError(error, 'bot');

      expect(marketplaceContext.suggestions).not.toEqual(mcpContext.suggestions);
      expect(mcpContext.suggestions).not.toEqual(botContext.suggestions);
    });

    it('should handle operation-specific suggestions', () => {
      const error = new Error('Failed');

      const installOp = EnhancedErrorHandler.convertToActionableError(
        error,
        'marketplace',
        'install'
      );
      const connectOp = EnhancedErrorHandler.convertToActionableError(
        error,
        'mcp',
        'connect'
      );

      expect(installOp.suggestions.some((s) => s.includes('install'))).toBe(true);
      expect(connectOp.suggestions.some((s) => s.includes('connect'))).toBe(true);
    });
  });
});
