import Debug from 'debug';
import { sendTyping } from '@src/message/helpers/handler/sendTyping';
import { ChatHistory } from '../../common/chatHistory';
import messageConfig from '../../interfaces/messageConfig';

const debug = Debug('app:MessageDelayScheduler');

/**
 * Manages delayed message sending to simulate natural typing and manage bot activity.
 */
export class MessageDelayScheduler {
  private static instance: MessageDelayScheduler;
  private chatHistory = ChatHistory.getInstance();
  private channelsTimingInfo: Record<string, { lastIncomingMessageTime?: number }> = {};
  private maxDelay: number;
  private minDelay: number;
  private decayRate: number;
  private typingInterval: NodeJS.Timeout | null = null;
  private delayTime: number = 0;
  private rateLimitPerChannel: number;
  private messageTimestamps: Record<string, number[]> = {};

  /**
   * Singleton pattern to ensure only one instance of MessageDelayScheduler.
   * @returns {MessageDelayScheduler} The single instance.
   */
  public static getInstance(): MessageDelayScheduler {
    if (!MessageDelayScheduler.instance) {
      debug('Creating a new instance of MessageDelayScheduler');
      MessageDelayScheduler.instance = new MessageDelayScheduler();
    }
    return MessageDelayScheduler.instance;
  }

  /**
   * Constructor with delay and decay settings from configuration.
   */
  private constructor() {
    this.maxDelay = messageConfig.get('MESSAGE_MAX_DELAY') || 10000;
    this.minDelay = messageConfig.get('MESSAGE_MIN_DELAY') || 1000;
    this.decayRate = messageConfig.get('MESSAGE_DECAY_RATE') || -0.5;
    this.rateLimitPerChannel = messageConfig.get('MESSAGE_RATE_LIMIT_PER_CHANNEL') || 5;
  }

  /**
   * Logs the arrival of an incoming message.
   * @param channelId - The ID of the channel.
   */
  public logIncomingMessage(channelId: string): void {
    const currentTime = Date.now();
    if (!this.channelsTimingInfo[channelId]) {
      this.channelsTimingInfo[channelId] = {};
    }
    this.channelsTimingInfo[channelId].lastIncomingMessageTime = currentTime;
    debug(`Channel ${channelId} logged incoming message at ${currentTime}.`);
  }

  /**
   * Calculates the delay before sending a message.
   * @param channelId - The ID of the channel.
   * @param messageContent - The message content.
   * @param processingTime - Time spent processing.
   * @returns {number} The delay in milliseconds.
   */
  public calculateDelay(channelId: string, messageContent: string, processingTime: number): number {
    const currentTime = Date.now();
    const channelInfo = this.channelsTimingInfo[channelId];

    if (!channelInfo || !channelInfo.lastIncomingMessageTime) {
      return Math.max(this.minDelay - processingTime, 0);
    }

    const timeSinceLastIncomingMessage = currentTime - channelInfo.lastIncomingMessageTime;
    const recentMessages = this.chatHistory.getRecentMessages(60000);
    const activityMultiplier = Math.min(Math.pow(1.2, recentMessages.length), 5); // Capped at 5x
    const sizeMultiplier = Math.max(1, messageContent.length / 50);

    let delay = Math.exp(this.decayRate * timeSinceLastIncomingMessage / 1000) * this.maxDelay;
    delay = Math.min(Math.max(delay, this.minDelay), this.maxDelay) * activityMultiplier * sizeMultiplier;

    debug(`Channel ${channelId} calculated delay: ${delay}ms.`);
    return delay;
  }

  /**
   * Schedules a message to be sent after the delay.
   * @param channelId - The channel ID.
   * @param messageContent - The content of the message.
   * @param processingTime - The time taken for processing.
   * @param sendFunction - The function to send the message.
   */
  public scheduleMessage(
    channelId: string,
    messageContent: string,
    processingTime: number,
    sendFunction: (message: string) => void
  ): void {
    if (this.isRateLimited(channelId)) {
      debug(`Channel ${channelId} is rate-limited. Message not scheduled.`);
      return;
    }

    const delay = this.calculateDelay(channelId, messageContent, processingTime);
    debug(`Scheduling message in channel ${channelId} with delay of ${delay}ms.`);

    setTimeout(() => {
      try {
        sendFunction(messageContent);
        this.logIncomingMessage(channelId);
        this.recordMessageTimestamp(channelId);
      } catch (error) {
        debug(`Error sending message: ${(error as Error).message}`);
      }
    }, delay);
  }

  /**
   * Records the timestamp of a sent message for rate limiting.
   * @param channelId - The channel ID.
   */
  private recordMessageTimestamp(channelId: string): void {
    const currentTime = Date.now();
    if (!this.messageTimestamps[channelId]) {
      this.messageTimestamps[channelId] = [];
    }
    this.messageTimestamps[channelId].push(currentTime);
    // Remove timestamps older than 60 seconds
    this.messageTimestamps[channelId] = this.messageTimestamps[channelId].filter(
      timestamp => currentTime - timestamp <= 60000
    );
  }

  /**
   * Checks if the channel is rate-limited.
   * @param channelId - The channel ID.
   * @returns {boolean} True if rate-limited, else false.
   */
  private isRateLimited(channelId: string): boolean {
    const currentTime = Date.now();
    if (!this.messageTimestamps[channelId]) {
      this.messageTimestamps[channelId] = [];
      return false;
    }

    // Remove timestamps older than 60 seconds
    this.messageTimestamps[channelId] = this.messageTimestamps[channelId].filter(
      timestamp => currentTime - timestamp <= 60000
    );

    const isLimited = this.messageTimestamps[channelId].length >= this.rateLimitPerChannel;
    if (isLimited) {
      debug(`Channel ${channelId} has reached the rate limit of ${this.rateLimitPerChannel} messages per minute.`);
    }

    return isLimited;
  }

  /**
   * Stops the typing indicator.
   */
  public stop(): void {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
      debug('Typing indicator stopped');
    }
  }
}
