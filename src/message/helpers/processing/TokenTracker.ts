import Debug from 'debug';
import messageConfig from '@config/messageConfig';

const debug = Debug('app:TokenTracker');

interface TokenRecord {
    tokens: number;
    timestamp: number;
}

/**
 * Token Tracker - tracks token usage per channel to prevent spam
 * 
 * Features:
 * - Tracks tokens generated per channel in a sliding window (default: 1 minute)
 * - Reduces response probability based on recent token usage
 * - Reduces max_tokens for follow-up responses after high usage
 */
class TokenTracker {
  private static instance: TokenTracker;
  private channelTokens: Map<string, TokenRecord[]> = new Map();

  // Configuration
  private readonly WINDOW_MS = 60000; // 1 minute window
  private readonly HIGH_USAGE_THRESHOLD = 1000; // tokens before reducing probability
  private readonly MAX_TOKENS_IN_WINDOW = 3000; // hard cap per channel per minute
  private readonly REDUCTION_FACTOR = 0.1; // reduce probability by 10% per 100 tokens over threshold

  private constructor() {
    debug('TokenTracker initialized');
  }

  public static getInstance(): TokenTracker {
    if (!TokenTracker.instance) {
      TokenTracker.instance = new TokenTracker();
    }
    return TokenTracker.instance;
  }

  /**
     * Record tokens generated for a channel
     */
  public recordTokens(channelId: string, tokenCount: number): void {
    const now = Date.now();
    const records = this.channelTokens.get(channelId) || [];

    // Clean old records
    const recentRecords = records.filter(r => (now - r.timestamp) < this.WINDOW_MS);

    // Add new record
    recentRecords.push({ tokens: tokenCount, timestamp: now });
    this.channelTokens.set(channelId, recentRecords);

    debug(`Recorded ${tokenCount} tokens for channel ${channelId}. Total in window: ${this.getTokensInWindow(channelId)}`);
  }

  /**
     * Get total tokens in the current window for a channel
     */
  public getTokensInWindow(channelId: string): number {
    const now = Date.now();
    const records = this.channelTokens.get(channelId) || [];
    const recentRecords = records.filter(r => (now - r.timestamp) < this.WINDOW_MS);
    return recentRecords.reduce((sum, r) => sum + r.tokens, 0);
  }

  /**
     * Get response probability modifier based on token usage
     * Returns 1.0 for normal, 0.0-1.0 for reduced probability
     */
  public getResponseProbabilityModifier(channelId: string): number {
    const tokensUsed = this.getTokensInWindow(channelId);

    if (tokensUsed >= this.MAX_TOKENS_IN_WINDOW) {
      debug(`Channel ${channelId} at max tokens (${tokensUsed}), blocking response`);
      return 0; // Block responses entirely
    }

    if (tokensUsed <= this.HIGH_USAGE_THRESHOLD) {
      return 1.0; // Normal probability
    }

    // Reduce probability based on tokens over threshold
    const tokensOverThreshold = tokensUsed - this.HIGH_USAGE_THRESHOLD;
    const reduction = (tokensOverThreshold / 100) * this.REDUCTION_FACTOR;
    const modifier = Math.max(0.1, 1.0 - reduction); // Never go below 10%

    debug(`Channel ${channelId} high usage (${tokensUsed} tokens), probability modifier: ${modifier}`);
    return modifier;
  }

  /**
     * Get adjusted max tokens based on recent usage
     * Returns reduced max_tokens after high usage to prevent walls of text
     */
  public getAdjustedMaxTokens(channelId: string, defaultMaxTokens: number): number {
    const tokensUsed = this.getTokensInWindow(channelId);

    if (tokensUsed <= this.HIGH_USAGE_THRESHOLD) {
      return defaultMaxTokens; // Normal max tokens
    }

    // Reduce max tokens as usage increases
    const usageRatio = tokensUsed / this.MAX_TOKENS_IN_WINDOW;
    const adjustedMax = Math.max(50, Math.floor(defaultMaxTokens * (1 - usageRatio * 0.7)));

    debug(`Channel ${channelId} high usage, reducing max_tokens from ${defaultMaxTokens} to ${adjustedMax}`);
    return adjustedMax;
  }

  /**
   * Get delay multiplier based on recent token usage
   * Returns 1.0 for normal, higher for more delay after high usage
   */
  public getDelayMultiplier(channelId: string): number {
    const tokensUsed = this.getTokensInWindow(channelId);

    if (tokensUsed <= this.HIGH_USAGE_THRESHOLD) {
      return 1.0; // Normal delay
    }

    // Increase delay as token usage increases
    // At max tokens, delay is 4x normal
    const usageRatio = tokensUsed / this.MAX_TOKENS_IN_WINDOW;
    const multiplier = 1.0 + (usageRatio * 3); // 1x to 4x

    debug(`Channel ${channelId} high usage (${tokensUsed} tokens), delay multiplier: ${multiplier.toFixed(2)}x`);
    return multiplier;
  }

  /**
     * Estimate token count from text (rough approximation: ~4 chars per token)
     */
  public estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
     * Clear records (for testing)
     */
  public clear(channelId?: string): void {
    if (channelId) {
      this.channelTokens.delete(channelId);
    } else {
      this.channelTokens.clear();
    }
  }
}

export default TokenTracker;
