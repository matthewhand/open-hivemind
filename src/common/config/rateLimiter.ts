/**
 * Rate Limiter for Discord Bot Messages
 *
 * Implements a rate-limiting mechanism to manage and restrict the number of messages
 * the bot sends, ensuring compliance with predefined hourly and daily limits. This helps
 * in avoiding spam and maintaining a balanced interaction rate with users.
 *
 * Key Features:
 * - Timestamp tracking for message history
 * - Conditional guards to prevent over-sending
 * - Flexible configuration via environment variables
 */

import Debug from 'debug';
const debug = Debug('app:rateLimiter');

/**
 * RateLimiter class manages the rate-limiting logic.
 */
class RateLimiter {
  private messagesLastHour: Date[] = [];
  private messagesLastDay: Date[] = [];

  /**
   * Records the current time as a timestamp for a sent message.
   */
  addMessageTimestamp(): void {
    const now = new Date();
    this.messagesLastHour.push(now);
    this.messagesLastDay.push(now);

    debug('Added message timestamp:', now);

    // Filter timestamps to keep only those within the last hour
    const oneHourAgo = new Date(now.getTime() - 3600000);
    this.messagesLastHour = this.messagesLastHour.filter(timestamp => timestamp > oneHourAgo);

    // Filter for timestamps within the last 24 hours
    const oneDayAgo = new Date(now.getTime() - 86400000);
    this.messagesLastDay = this.messagesLastDay.filter(timestamp => timestamp > oneDayAgo);
  }

  /**
   * Checks if sending a new message would exceed the configured rate limits.
   * @returns True if a message can be sent, false otherwise.
   */
  canSendMessage(): boolean {
    const canSend = this.messagesLastHour.length < parseInt(process.env.LLM_MESSAGE_LIMIT_PER_HOUR || '60') 
                      && this.messagesLastDay.length < parseInt(process.env.LLM_MESSAGE_LIMIT_PER_DAY || '1000');
    debug('canSendMessage result:', canSend);
    return canSend;
  }
}

const rateLimiter = new RateLimiter();
export default rateLimiter;
