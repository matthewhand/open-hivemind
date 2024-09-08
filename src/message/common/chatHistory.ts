/**
 * ChatHistory - Tracks messages sent by the bot for timing and activity purposes.
 * 
 * This class allows the bot to store, query, and manage its own messages, providing features such as:
 * - Tracking recent messages with timestamps and channels.
 * - Querying messages within a specific timeframe.
 * - Clearing old messages to maintain memory efficiency.
 */

interface ChatMessage {
  content: string;
  timestamp: number;
  channelId: string;
}

export class ChatHistory {
  private static instance: ChatHistory;
  private history: ChatMessage[] = [];

  /**
   * Singleton pattern: Ensures only one instance of ChatHistory is used across the bot.
   * @returns {ChatHistory} The single instance of ChatHistory.
   */
  public static getInstance(): ChatHistory {
    if (!ChatHistory.instance) {
      ChatHistory.instance = new ChatHistory();
    }
    return ChatHistory.instance;
  }

  /**
   * Adds a new message to the chat history.
   * @param {string} content - The content of the message sent by the bot.
   * @param {string} channelId - The ID of the channel where the message was sent.
   */
  public addMessage(content: string, channelId: string): void {
    if (!content || !channelId) {
      console.error('[ChatHistory] Invalid message or channel ID provided.');
      return;
    }
    const newMessage: ChatMessage = { content, timestamp: Date.now(), channelId };
    this.history.push(newMessage);
    console.debug('[ChatHistory] Message added:', newMessage);
  }

  /**
   * Retrieves all messages sent within the specified timeframe.
   * @param {number} timeframe - The time in milliseconds to look back (e.g., last 60000 ms).
   * @returns {ChatMessage[]} An array of messages sent within the timeframe.
   */
  public getRecentMessages(timeframe: number): ChatMessage[] {
    if (timeframe <= 0) {
      console.error('[ChatHistory] Invalid timeframe provided:', timeframe);
      return [];
    }
    const currentTime = Date.now();
    const recentMessages = this.history.filter(msg => currentTime - msg.timestamp <= timeframe);
    console.debug('[ChatHistory] Recent messages retrieved:', recentMessages);
    return recentMessages;
  }

  /**
   * Clears messages older than the specified cutoff time.
   * @param {number} cutoffTime - The time in milliseconds (messages older than this will be removed).
   */
  public clearOldMessages(cutoffTime: number): void {
    this.history = this.history.filter(msg => msg.timestamp > cutoffTime);
    console.debug('[ChatHistory] Cleared old messages. Current history size:', this.history.length);
  }
}
