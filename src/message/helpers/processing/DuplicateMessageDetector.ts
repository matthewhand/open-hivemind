import Debug from 'debug';
import TimerRegistry from '@src/utils/TimerRegistry';
import messageConfig from '@config/messageConfig';

const debug = Debug('app:DuplicateMessageDetector');

interface MessageRecord {
  content: string;
  timestamp: number;
  channelId: string;
}

/**
 * Detects and suppresses duplicate/repetitive bot messages.
 * Tracks recent messages per channel and rejects duplicates within a configurable time window.
 *
 * Memory-bounded with automatic cleanup to prevent unbounded growth.
 */
export default class DuplicateMessageDetector {
  private static instance: DuplicateMessageDetector;
  private recentMessages = new Map<string, MessageRecord[]>();

  // Bounded cache configuration
  private readonly MAX_CHANNELS = parseInt(
    process.env.DUPLICATE_DETECTOR_MAX_CHANNELS || '1000',
    10
  );
  private readonly CLEANUP_INTERVAL_MS = parseInt(
    process.env.DUPLICATE_DETECTOR_CLEANUP_INTERVAL_MS || '60000',
    10
  );
  private cleanupTimerId: string | null = null;

  private constructor() {
    debug(
      'DuplicateMessageDetector initialized with MAX_CHANNELS=%d, CLEANUP_INTERVAL_MS=%d',
      this.MAX_CHANNELS,
      this.CLEANUP_INTERVAL_MS
    );
    this.startCleanup();
  }

  public static getInstance(): DuplicateMessageDetector {
    if (!DuplicateMessageDetector.instance) {
      DuplicateMessageDetector.instance = new DuplicateMessageDetector();
    }
    return DuplicateMessageDetector.instance;
  }

  /**
   * Check if a message is a duplicate
   * @param channelId The channel ID
   * @param content The message content to check
   * @returns true if the message is a duplicate and should be suppressed
   */
  /**
   * Check if a message is a duplicate
   * @param channelId The channel ID
   * @param content The message content to check
   * @param externalHistory Optional list of recent message contents from the channel (to check against other users/bots)
   * @returns true if the message is a duplicate and should be suppressed
   */
  public isDuplicate(channelId: string, content: string, externalHistory: string[] = []): boolean {
    try {
      const suppressEnabled = messageConfig.get('MESSAGE_SUPPRESS_DUPLICATES');
      if (!suppressEnabled) {
        return false;
      }

      const windowMs = messageConfig.get('MESSAGE_DUPLICATE_WINDOW_MS') || 300000;
      const now = Date.now();

      // Get or create message history for this channel
      const history = this.recentMessages.get(channelId) || [];

      // Clean up old messages outside the time window
      const recentHistory = history.filter((msg) => now - msg.timestamp < windowMs);

      // Normalize content for comparison (trim, lowercase, remove extra whitespace)
      const normalizedContent = this.normalizeContent(content);

      // Check for duplicates in internal history (what WE sent recently)
      const isInternalDupe = recentHistory.some(
        (msg) => this.normalizeContent(msg.content) === normalizedContent
      );

      // Check for duplicates in external history (what OTHERS sent recently)
      // Increased to last 15 messages to catch wider mirroring
      const isExternalDupe = externalHistory
        .slice(-15)
        .some((msgContent) => this.areMessagesDuplicate(msgContent, normalizedContent));

      if (isInternalDupe || isExternalDupe) {
        debug(
          `Duplicate message detected in channel ${channelId}: "${content.substring(0, 50)}..."`
        );
        return true;
      }

      return false;
    } catch (error) {
      debug(`Error checking for duplicates: ${error}`);
      return false; // On error, don't suppress
    }
  }

  private areMessagesDuplicate(content1: string, normalizedContent2: string): boolean {
    const norm1 = this.normalizeContent(content1);
    if (norm1 === normalizedContent2) {
      return true;
    }

    // Fuzzy check: if edit distance is very small relative to length
    // e.g. "Hello world." vs "Hello world!"
    if (norm1.length > 10 && normalizedContent2.length > 10) {
      const maxLen = Math.max(norm1.length, normalizedContent2.length);
      // Allow 5% difference or 5 characters, whichever is smaller
      const threshold = Math.min(5, Math.ceil(maxLen * 0.05));

      // Optimization: If length difference exceeds threshold, Levenshtein distance
      // will definitely exceed threshold. Avoid O(N*M) calculation.
      if (Math.abs(norm1.length - normalizedContent2.length) > threshold) {
        return false;
      }

      const dist = this.levenshteinDistance(norm1, normalizedContent2, threshold);
      return dist <= threshold;
    }
    return false;
  }

  private levenshteinDistance(a: string, b: string, limit?: number): number {
    if (a.length === 0) {
      return b.length;
    }
    if (b.length === 0) {
      return a.length;
    }

    // Optimization: Use O(min(N, M)) space instead of O(N*M)
    // Make sure 'a' is the shorter string to minimize row size
    if (a.length > b.length) {
      [a, b] = [b, a];
    }

    let row = Array.from({ length: a.length + 1 }, (_, k) => k);
    let nextRow = new Array(a.length + 1);

    for (let i = 1; i <= b.length; i++) {
      nextRow[0] = i;
      let minRowVal = i;

      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          nextRow[j] = row[j - 1];
        } else {
          nextRow[j] = Math.min(row[j - 1], row[j], nextRow[j - 1]) + 1;
        }
        if (nextRow[j] < minRowVal) {
          minRowVal = nextRow[j];
        }
      }

      // Early exit if limit provided and all values in row exceed limit
      if (limit !== undefined && minRowVal > limit) {
        return limit + 1;
      }

      // Swap rows for next iteration
      const temp = row;
      row = nextRow;
      nextRow = temp;
    }

    return row[a.length];
  }

  /**
   * Record a message that was sent successfully
   * @param channelId The channel ID
   * @param content The message content
   */
  public recordMessage(channelId: string, content: string): void {
    try {
      const windowMs = messageConfig.get('MESSAGE_DUPLICATE_WINDOW_MS') || 300000;
      const historySize = messageConfig.get('MESSAGE_DUPLICATE_HISTORY_SIZE') || 10;
      const now = Date.now();

      // Get or create message history for this channel
      let history = this.recentMessages.get(channelId) || [];

      // Clean up old messages
      history = history.filter((msg) => now - msg.timestamp < windowMs);

      // Add new message
      history.push({
        content,
        timestamp: now,
        channelId,
      });

      // Trim to max history size
      if (history.length > historySize) {
        history = history.slice(-historySize);
      }

      this.recentMessages.set(channelId, history);
      debug(`Recorded message in channel ${channelId}, history size: ${history.length}`);
    } catch (error) {
      debug(`Error recording message: ${error}`);
    }
  }

  /**
   * Returns a temperature boost based on repeated words across recent bot messages.
   * This helps discourage persistent tics (e.g., saying "shrug" every reply) even when
   * the full response isn't a duplicate.
   */
  public getRepetitionTemperatureBoost(channelId: string): number {
    try {
      const windowMs = messageConfig.get('MESSAGE_DUPLICATE_WINDOW_MS') || 300000;
      const historySize = messageConfig.get('MESSAGE_DUPLICATE_HISTORY_SIZE') || 10;

      const minHistoryRaw = messageConfig.get('MESSAGE_TEMPERATURE_REPETITION_MIN_HISTORY');
      const minHistory = Math.max(1, Number(minHistoryRaw) || 3);

      const ratioThresholdRaw = messageConfig.get('MESSAGE_TEMPERATURE_REPETITION_RATIO_THRESHOLD');
      const ratioThreshold = Math.max(0, Math.min(1, Number(ratioThresholdRaw) || 0.6));

      const minDocFreqRaw = messageConfig.get('MESSAGE_TEMPERATURE_REPETITION_MIN_DOC_FREQ');
      const minDocFreq = Math.max(1, Number(minDocFreqRaw) || 3);

      const maxBoostRaw = messageConfig.get('MESSAGE_TEMPERATURE_REPETITION_MAX_BOOST');
      const maxBoost = Math.max(0, Number(maxBoostRaw) || 0.4);

      const now = Date.now();
      const history = this.recentMessages.get(channelId) || [];
      const recentHistory = history
        .filter((msg) => now - msg.timestamp < windowMs)
        .slice(-historySize);

      if (recentHistory.length < minHistory) {
        return 0;
      }

      const docFreq = new Map<string, number>();
      for (const msg of recentHistory) {
        const uniqueWords = new Set(this.tokenizeWords(msg.content));
        for (const w of uniqueWords) {
          docFreq.set(w, (docFreq.get(w) || 0) + 1);
        }
      }

      const denom = recentHistory.length;
      let bestRatio = 0;
      let bestWord = '';
      for (const [w, c] of docFreq.entries()) {
        if (c < Math.min(minDocFreq, denom)) {
          continue;
        }
        const ratio = c / denom;
        if (ratio >= ratioThreshold && ratio > bestRatio) {
          bestRatio = ratio;
          bestWord = w;
        }
      }

      if (!bestWord) {
        return 0;
      }

      // Map ratioThreshold..1 -> 0..1
      const score = ratioThreshold >= 1 ? 1 : (bestRatio - ratioThreshold) / (1 - ratioThreshold);
      const boost = Math.max(0, Math.min(maxBoost, maxBoost * score));
      if (boost > 0) {
        debug(
          `Repetition temp boost for ${channelId}: word="${bestWord}" ratio=${bestRatio.toFixed(2)} boost=${boost.toFixed(2)}`
        );
      }
      return boost;
    } catch (error) {
      debug(`Error computing repetition temperature boost: ${error}`);
      return 0;
    }
  }

  /**
   * Normalize message content for comparison
   * Strips non-alphanumeric (keeps spaces) to catch "Hello." vs "Hello"
   */
  private normalizeContent(content: string): string {
    return content
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, ' '); // Collapse whitespace
  }

  private tokenizeWords(content: string): string[] {
    const stop = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'so',
      'to',
      'of',
      'in',
      'on',
      'for',
      'with',
      'at',
      'by',
      'from',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'it',
      'this',
      'that',
      'these',
      'those',
      'i',
      'you',
      'we',
      'they',
      'he',
      'she',
      'me',
      'my',
      'your',
      'our',
      'their',
      'him',
      'her',
      'them',
      'as',
      'if',
      'then',
      'than',
      'just',
      'like',
      'okay',
      'ok',
      'yeah',
      'yep',
      'no',
      'yes',
      'not',
    ]);

    const matches = (content || '').toLowerCase().match(/[a-z0-9']+/g) || [];
    return matches
      .map((w) => w.replace(/^'+|'+$/g, ''))
      .filter((w) => w.length >= 3)
      .filter((w) => !stop.has(w));
  }

  /**
   * Clear message history (useful for testing)
   */
  public clearHistory(channelId?: string): void {
    if (channelId) {
      this.recentMessages.delete(channelId);
    } else {
      this.recentMessages.clear();
    }
  }

  /**
   * Start periodic cleanup of old messages.
   * Uses TimerRegistry for proper cleanup on shutdown.
   */
  private startCleanup(): void {
    this.cleanupTimerId = TimerRegistry.getInstance().registerInterval(
      'duplicate-detector-cleanup',
      () => this.cleanup(),
      this.CLEANUP_INTERVAL_MS,
      'DuplicateMessageDetector periodic cleanup'
    );
  }

  /**
   * Cleanup old messages and enforce max channel limit.
   * This prevents unbounded memory growth.
   */
  private cleanup(): void {
    const windowMs = messageConfig.get('MESSAGE_DUPLICATE_WINDOW_MS') || 300000;
    const now = Date.now();
    let cleaned = 0;

    // Remove expired messages from each channel
    for (const [channelId, history] of this.recentMessages) {
      const filtered = history.filter((msg) => now - msg.timestamp < windowMs);
      if (filtered.length === 0) {
        this.recentMessages.delete(channelId);
        cleaned++;
      } else if (filtered.length !== history.length) {
        this.recentMessages.set(channelId, filtered);
      }
    }

    // Enforce max channels limit (LRU-style: remove oldest channels first)
    if (this.recentMessages.size > this.MAX_CHANNELS) {
      // Get all channels with their most recent message timestamp
      const channelTimestamps: [string, number][] = [];
      for (const [channelId, history] of this.recentMessages) {
        if (history.length > 0) {
          channelTimestamps.push([channelId, history[history.length - 1].timestamp]);
        }
      }

      // Sort by timestamp (oldest first)
      channelTimestamps.sort((a, b) => a[1] - b[1]);

      // Remove oldest channels
      const toRemove = channelTimestamps.slice(0, this.recentMessages.size - this.MAX_CHANNELS);
      for (const [channelId] of toRemove) {
        this.recentMessages.delete(channelId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      debug(
        'Cleanup removed %d empty/old channels, current size: %d',
        cleaned,
        this.recentMessages.size
      );
    }
  }

  /**
   * Get statistics about the detector.
   */
  public getStats(): { channels: number; totalMessages: number; maxChannels: number } {
    let totalMessages = 0;
    for (const history of this.recentMessages.values()) {
      totalMessages += history.length;
    }
    return {
      channels: this.recentMessages.size,
      totalMessages,
      maxChannels: this.MAX_CHANNELS,
    };
  }

  /**
   * Shutdown the detector and cleanup resources.
   */
  public shutdown(): void {
    if (this.cleanupTimerId) {
      TimerRegistry.getInstance().clear(this.cleanupTimerId);
      this.cleanupTimerId = null;
    }
    this.recentMessages.clear();
    debug('DuplicateMessageDetector shutdown complete');
  }
}
