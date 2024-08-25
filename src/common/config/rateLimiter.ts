import ConfigurationManager from '@config/ConfigurationManager';
/**
 * Rate Limiter for Discord Bot Messages
 * 
 * Implements a rate-limiting mechanism to manage and restrict the number of messages
 * the bot sends, ensuring compliance with predefined hourly and daily limits. This helps
 * in avoiding spam and maintaining a balanced interaction rate with users.
 * 
 * The rate limits are configurable through environment variables, allowing flexibility
 * in adjusting the bot's messaging behavior based on operational needs or platform constraints.
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
        // Filter timestamps to keep only those within the last hour
        const oneHourAgo = new Date(now.getTime() - 3600000);
        this.messagesLastHour = this.messagesLastHour.filter(timestamp => timestamp > oneHourAgo);
        // Filter for timestamps within the last 24 hours
        const oneDayAgo = new Date(now.getTime() - 86400000);
        this.messagesLastDay = this.messagesLastDay.filter(timestamp => timestamp > oneDayAgo);
    }
    /**
     * Checks if sending a new message would exceed the configured rate limits.
     * 
     * @returns True if a message can be sent, false otherwise.
     */
    canSendMessage(): boolean {
        const canSend = this.messagesLastHour.length < ConfigurationManager.LLM_MESSAGE_LIMIT_PER_HOUR 
                        && this.messagesLastDay.length < ConfigurationManager.LLM_MESSAGE_LIMIT_PER_DAY;
        console.debug('canSendMessage: '  canSend);
        return canSend;
    }
}
const rateLimiter = new RateLimiter();
export default rateLimiter;
