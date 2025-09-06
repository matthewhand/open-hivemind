/**
 * Input sanitization utilities for the Open Hivemind bot
 *
 * Provides security-focused input validation and sanitization
 * to prevent injection attacks and ensure data integrity.
 */
export class InputSanitizer {
  /**
   * Sanitize user messages to prevent injection attacks
   *
   * @param content - Raw message content
   * @returns Sanitized message content
   */
  static sanitizeMessage(content: string): string {
    if (!content || typeof content !== 'string') {
      return '';
    }

    return content
      // Remove script tags and javascript: protocols
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      // Remove potentially harmful HTML
      .replace(/<[^>]*>/g, '')
      // Remove null bytes and control characters
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Trim whitespace
      .trim()
      // Limit length to prevent abuse
      .substring(0, 10000);
  }

  /**
   * Validate and sanitize user IDs
   *
   * @param userId - Raw user ID
   * @returns Sanitized user ID or null if invalid
   */
  static sanitizeUserId(userId: string): string | null {
    if (!userId || typeof userId !== 'string') {
      return null;
    }

    // Allow alphanumeric, underscores, hyphens, and dots
    const sanitized = userId.replace(/[^a-zA-Z0-9_.-]/g, '');

    // Must be between 1 and 100 characters
    if (sanitized.length < 1 || sanitized.length > 100) {
      return null;
    }

    return sanitized;
  }

  /**
   * Validate and sanitize channel IDs
   *
   * @param channelId - Raw channel ID
   * @returns Sanitized channel ID or null if invalid
   */
  static sanitizeChannelId(channelId: string): string | null {
    if (!channelId || typeof channelId !== 'string') {
      return null;
    }

    // Allow alphanumeric, underscores, hyphens, and dots
    const sanitized = channelId.replace(/[^a-zA-Z0-9_.-]/g, '');

    // Must be between 1 and 100 characters
    if (sanitized.length < 1 || sanitized.length > 100) {
      return null;
    }

    return sanitized;
  }

  /**
   * Validate message content for basic requirements
   *
   * @param content - Message content to validate
   * @returns Validation result
   */
  static validateMessage(content: string): { isValid: boolean; reason?: string } {
    if (!content || typeof content !== 'string') {
      return { isValid: false, reason: 'Content is required' };
    }

    if (content.trim().length === 0) {
      return { isValid: false, reason: 'Content cannot be empty' };
    }

    if (content.length > 10000) {
      return { isValid: false, reason: 'Content is too long' };
    }

    // Check for excessive special characters (potential spam)
    const specialCharCount = (content.match(/[^a-zA-Z0-9\s]/g) || []).length;
    if (specialCharCount > content.length * 0.5) {
      return { isValid: false, reason: 'Too many special characters' };
    }

    return { isValid: true };
  }

  /**
   * Sanitize configuration values
   *
   * @param value - Raw configuration value
   * @param type - Expected type ('string', 'number', 'boolean')
   * @returns Sanitized value or null if invalid
   */
  static sanitizeConfigValue(value: any, type: 'string' | 'number' | 'boolean'): any {
    switch (type) {
      case 'string':
        if (typeof value === 'string') {
          return value.trim().substring(0, 1000);
        }
        return null;

      case 'number':
        const num = Number(value);
        return isNaN(num) ? null : num;

      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true';
        }
        return null;

      default:
        return null;
    }
  }
}

/**
 * Rate limiting utilities
 */
export class RateLimiter {
  private static attempts = new Map<string, number[]>();

  /**
   * Check if an action should be rate limited
   *
   * @param identifier - Unique identifier (user ID, IP, etc.)
   * @param maxAttempts - Maximum attempts allowed
   * @param windowMs - Time window in milliseconds
   * @returns Whether the action is allowed
   */
  static checkLimit(
    identifier: string,
    maxAttempts: number = 10,
    windowMs: number = 60000
  ): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];

    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < windowMs);

    if (validAttempts.length >= maxAttempts) {
      return false; // Rate limited
    }

    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(identifier, validAttempts);

    return true; // Allowed
  }

  /**
   * Get remaining attempts for an identifier
   *
   * @param identifier - Unique identifier
   * @param maxAttempts - Maximum attempts allowed
   * @returns Number of remaining attempts
   */
  static getRemainingAttempts(identifier: string, maxAttempts: number = 10): number {
    const attempts = this.attempts.get(identifier) || [];
    return Math.max(0, maxAttempts - attempts.length);
  }

  /**
   * Clear rate limit data for an identifier
   *
   * @param identifier - Unique identifier
   */
  static clearLimit(identifier: string): void {
    this.attempts.delete(identifier);
  }
}