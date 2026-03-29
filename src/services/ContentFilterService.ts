import Debug from 'debug';
import type { ContentFilterConfig } from '@src/types/config';

const debug = Debug('app:ContentFilterService');

/**
 * Result of content filtering check
 */
export interface ContentFilterResult {
  /** Whether the content passed the filter */
  allowed: boolean;
  /** Reason for blocking, if blocked */
  reason?: string;
  /** Matched blocked terms, if any */
  matchedTerms?: string[];
}

/**
 * Service for filtering message content based on blocked terms and strictness levels.
 *
 * Strictness levels:
 * - low: Case-insensitive exact word match (whole words only)
 * - medium: Case-insensitive substring match
 * - high: Case-insensitive pattern match with partial word detection
 */
export class ContentFilterService {
  private static instance: ContentFilterService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ContentFilterService {
    if (!ContentFilterService.instance) {
      ContentFilterService.instance = new ContentFilterService();
    }
    return ContentFilterService.instance;
  }

  /**
   * Check if content passes the content filter.
   *
   * @param content - The message content to check
   * @param config - The content filter configuration
   * @param role - The message role (system messages bypass filtering)
   * @returns Result indicating if content is allowed
   */
  public checkContent(
    content: string,
    config: ContentFilterConfig,
    role?: string
  ): ContentFilterResult {
    // System messages always bypass content filtering
    if (role === 'system') {
      debug('System message bypassed content filter');
      return { allowed: true };
    }

    // If filter is disabled, allow all content
    if (!config.enabled) {
      return { allowed: true };
    }

    // If no blocked terms, allow all content
    if (!config.blockedTerms || config.blockedTerms.length === 0) {
      return { allowed: true };
    }

    const strictness = config.strictness || 'low';
    const matchedTerms: string[] = [];

    // Normalize content for checking
    const normalizedContent = content.toLowerCase();

    for (const term of config.blockedTerms) {
      if (!term || typeof term !== 'string') {
        continue;
      }

      const normalizedTerm = term.toLowerCase().trim();
      if (!normalizedTerm) {
        continue;
      }

      let isMatch = false;

      switch (strictness) {
        case 'low':
          // Exact word match only (whole words)
          isMatch = this.matchWholeWord(normalizedContent, normalizedTerm);
          break;

        case 'medium':
          // Substring match
          isMatch = normalizedContent.includes(normalizedTerm);
          break;

        case 'high':
          // Pattern match with partial word detection
          isMatch = this.matchPattern(normalizedContent, normalizedTerm);
          break;

        default:
          // Default to low strictness
          isMatch = this.matchWholeWord(normalizedContent, normalizedTerm);
      }

      if (isMatch) {
        matchedTerms.push(term);
      }
    }

    if (matchedTerms.length > 0) {
      const reason = `Content blocked: contains prohibited term${matchedTerms.length > 1 ? 's' : ''}`;
      debug(`Content blocked with strictness ${strictness}. Matched terms:`, matchedTerms);
      return {
        allowed: false,
        reason,
        matchedTerms,
      };
    }

    return { allowed: true };
  }

  /**
   * Match whole words only (low strictness)
   */
  private matchWholeWord(content: string, term: string): boolean {
    // Create word boundary regex
    const pattern = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'i');
    return pattern.test(content);
  }

  /**
   * Match patterns with partial word detection (high strictness)
   */
  private matchPattern(content: string, term: string): boolean {
    // Check direct substring match first
    if (content.includes(term)) {
      return true;
    }

    // Check for leetspeak and common obfuscation patterns
    // Replace common letter substitutions
    const deobfuscated = this.deobfuscate(content);

    // Also deobfuscate the term for pattern matching
    const deobfuscatedTerm = this.deobfuscate(term);

    return deobfuscated.includes(deobfuscatedTerm);
  }

  /**
   * Attempt to deobfuscate common text obfuscation patterns
   */
  private deobfuscate(text: string): string {
    return text
      .replace(/0/g, 'o')
      .replace(/1/g, 'i')
      .replace(/3/g, 'e')
      .replace(/4/g, 'a')
      .replace(/5/g, 's')
      .replace(/7/g, 't')
      .replace(/8/g, 'b')
      .replace(/\$/g, 's')
      .replace(/@/g, 'a')
      .replace(/!/g, 'i')
      .replace(/\*/g, '')
      .replace(/_/g, '')
      .replace(/-/g, '')
      .replace(/\s+/g, '');
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Filter content for display (redact blocked terms)
   *
   * @param content - The content to filter
   * @param config - The content filter configuration
   * @returns Filtered content with blocked terms redacted
   */
  public filterContentForDisplay(
    content: string,
    config: ContentFilterConfig
  ): string {
    if (!config.enabled || !config.blockedTerms || config.blockedTerms.length === 0) {
      return content;
    }

    let filtered = content;
    const strictness = config.strictness || 'low';

    for (const term of config.blockedTerms) {
      if (!term || typeof term !== 'string') {
        continue;
      }

      const normalizedTerm = term.toLowerCase().trim();
      if (!normalizedTerm) {
        continue;
      }

      let pattern: RegExp;

      switch (strictness) {
        case 'low':
          // Replace whole words only
          pattern = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
          break;

        case 'medium':
        case 'high':
          // Replace all occurrences
          pattern = new RegExp(this.escapeRegex(term), 'gi');
          break;

        default:
          pattern = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
      }

      filtered = filtered.replace(pattern, '[FILTERED]');
    }

    return filtered;
  }
}

/**
 * Get singleton instance of ContentFilterService
 */
export function getContentFilterService(): ContentFilterService {
  return ContentFilterService.getInstance();
}
