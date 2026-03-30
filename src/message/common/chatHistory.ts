// src/message/common/chatHistory.ts

import type { IMessage } from '@src/message/interfaces/IMessage';

/**
 * ChatHistory - Tracks messages sent by the bot for timing and activity purposes.
 *
 * This class allows the bot to store, query, and manage its own messages, providing features such as:
 * - Tracking recent messages with timestamps and channels.
 * - Querying messages within a specific timeframe.
 * - Clearing old messages to maintain memory efficiency.
 */
export class ChatHistory {
  private static instance: ChatHistory;
  private history: IMessage[] = [];

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
   * @param {IMessage} message - The IMessage instance to add.
   */
  public addMessage(message: IMessage): void {
    this.history.push(message);
    console.debug('[ChatHistory] Message added:', message.getMessageId());
  }

  /**
   * Retrieves all messages sent within the specified timeframe.
   * @param {number} timeframe - The time in milliseconds to look back (e.g., last 60000 ms).
   * @returns {IMessage[]} An array of messages sent within the timeframe.
   */
  public getRecentMessages(timeframe: number): IMessage[] {
    if (timeframe <= 0) {
      console.error('[ChatHistory] Invalid timeframe provided:', timeframe);
      return [];
    }
    const currentTime = Date.now();
    const recentMessages = this.history.filter(
      (msg) => currentTime - msg.getTimestamp().getTime() <= timeframe
    );
    console.debug(
      '[ChatHistory] Recent messages retrieved:',
      recentMessages.map((m) => m.getMessageId())
    );
    return recentMessages;
  }

  /**
   * Clears messages older than the specified cutoff time.
   * @param {number} cutoffTime - The time in milliseconds (messages older than this will be removed).
   */
  public clearOldMessages(cutoffTime: number): void {
    const cutoffDate = new Date(Date.now() - cutoffTime);
    const initialLength = this.history.length;
    this.history = this.history.filter((msg) => msg.getTimestamp() > cutoffDate);
    const clearedMessages = initialLength - this.history.length;
    console.debug(
      `[ChatHistory] Cleared ${clearedMessages} old messages. Current history size: ${this.history.length}`
    );
  }
}
