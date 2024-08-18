/**
 * Rate Limiter for Discord Bot Messages
 * 
 * Implements a rate-limiting mechanism to manage and restrict the number of messages
 * the bot sends, ensuring compliance with predefined hourly and daily limits. This helps
 * in avoiding spam and maintaining a balanced interaction rate with users.
 * 
 * The rate limits are configurable through environment variables, allowing flexibility
 * in adjusting the bot's messaging behavior based on operational needs or platform constraints.
 * 
 * Environment Variables:
 * - LLM_MESSAGE_LIMIT_PER_HOUR: Defines the maximum number of messages the bot can send in an hour.
 * - LLM_MESSAGE_LIMIT_PER_DAY: Sets the daily maximum message count.
 * 
 * Methods:
 * - addMessageTimestamp(): Records the current time as a timestamp for a sent message.
 * - canSendMessage(): Checks if sending a new message would exceed the configured rate limits.
 */

const { LLM_MESSAGE_LIMIT_PER_HOUR, LLM_MESSAGE_LIMIT_PER_DAY } = require('../config/constants');

class RateLimiter {
  constructor() {
    this.messagesLastHour = [];
    this.messagesLastDay = [];
  }

  addMessageTimestamp() {
    const now = new Date();
    this.messagesLastHour.push(now);
    this.messagesLastDay.push(now);

    // Filter timestamps to keep only those within the last hour
    const oneHourAgo = new Date(now - 3600000); // 3600000 milliseconds = 1 hour
    this.messagesLastHour = this.messagesLastHour.filter(timestamp => timestamp > oneHourAgo);

    // Similarly, filter for timestamps within the last 24 hours
    const oneDayAgo = new Date(now - 86400000); // 86400000 milliseconds = 24 hours
    this.messagesLastDay = this.messagesLastDay.filter(timestamp => timestamp > oneDayAgo);
  }

  canSendMessage() {
    return this.messagesLastHour.length < LLM_MESSAGE_LIMIT_PER_HOUR && this.messagesLastDay.length < LLM_MESSAGE_LIMIT_PER_DAY;
  }
}

const rateLimiter = new RateLimiter();

module.exports = rateLimiter;
