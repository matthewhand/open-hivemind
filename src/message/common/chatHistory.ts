// src/message/common/chatHistory.ts

import Debug from 'debug';
import type { IMessage } from '@src/message/interfaces/IMessage';
import { Logger } from '@common/logger';
import { takeWithinWindow } from '@common/slidingWindow';

const debug = Debug('app:message:common:chatHistory');
const logger = Logger.withContext('ChatHistory');

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
    logger.debug('Message added', { messageId: message.getMessageId() });
  }

  /**
   * Retrieves all messages sent within the specified timeframe.
   * @param {number} timeframe - The time in milliseconds to look back (e.g., last 60000 ms).
   * @returns {IMessage[]} An array of messages sent within the timeframe.
   */
  public getRecentMessages(timeframe: number): IMessage[] {
    if (timeframe <= 0) {
      debug('ERROR:', '[ChatHistory] Invalid timeframe provided:', timeframe);
      return [];
    }
    const threshold = Date.now() - timeframe;
    const inWindow = takeWithinWindow(
      this.history,
      (msg) => msg.getTimestamp().getTime(),
      threshold
    );
    // Always hand callers a defensive copy so they cannot mutate internal state
    // (takeWithinWindow may return the live array when everything is in-window).
    const recentMessages = inWindow === this.history ? [...inWindow] : inWindow;

    logger.debug('Recent messages retrieved', {
      messageIds: recentMessages.map((m) => m.getMessageId()),
      count: recentMessages.length,
    });
    return recentMessages;
  }

  /**
   * Clears messages older than the specified cutoff time.
   * @param {number} cutoffTime - The time in milliseconds (messages older than this will be removed).
   */
  public clearOldMessages(cutoffTime: number): void {
    const threshold = Date.now() - cutoffTime;
    const initialLength = this.history.length;

    this.history = takeWithinWindow(
      this.history,
      (msg) => msg.getTimestamp().getTime(),
      threshold
    );

    const clearedMessages = initialLength - this.history.length;
    logger.debug('Old messages cleared', {
      clearedCount: clearedMessages,
      remainingCount: this.history.length,
    });
  }
}
