import { ChatHistory } from '../../common/chatHistory';
import Debug from 'debug';

const debug = Debug('app:MessageDelayScheduler');

/**
 * MessageDelayScheduler - Manages delayed message sending to simulate natural typing and manage bot activity.
 * 
 * This class schedules messages by introducing a delay influenced by recent bot activity, message size, and time since last response.
 * Additionally, it sends typing indicators during the delay period.
 */
export class MessageDelayScheduler {
  private static instance: MessageDelayScheduler;
  private chatHistory = ChatHistory.getInstance();
  private channelsTimingInfo: Record<string, { lastIncomingMessageTime?: number }> = {};
  private maxDelay: number;
  private minDelay: number;
  private decayRate: number;

  /**
   * Singleton pattern: Ensures only one instance of MessageDelayScheduler is used.
   * @returns {MessageDelayScheduler} The single instance of MessageDelayScheduler.
   */
  public static getInstance(): MessageDelayScheduler {
    if (!MessageDelayScheduler.instance) {
      MessageDelayScheduler.instance = new MessageDelayScheduler({});
    }
    return MessageDelayScheduler.instance;
  }

  /**
   * Private constructor to enforce singleton pattern.
   * Initializes the timing parameters including max delay, min delay, and decay rate.
   * @param config - Configuration object containing maxDelay, minDelay, and decayRate.
   */
  private constructor({ maxDelay = 10000, minDelay = 1000, decayRate = -0.5 } = {}) {
    this.maxDelay = maxDelay;
    this.minDelay = minDelay;
    this.decayRate = decayRate;
  }

  /**
   * Logs the arrival of an incoming message for a specific channel.
   * This method updates the lastIncomingMessageTime for the channel to the current time.
   * @param channelId - The ID of the channel where the message was received.
   */
  public logIncomingMessage(channelId: string): void {
    const currentTime = Date.now();
    if (!this.channelsTimingInfo[channelId]) {
      this.channelsTimingInfo[channelId] = {};
    }
    this.channelsTimingInfo[channelId].lastIncomingMessageTime = currentTime;
    debug(`logIncomingMessage: Channel ${channelId} logged incoming message at ${currentTime}.`);
  }

  /**
   * Calculates the delay before sending a message, considering the time since the last message and message size.
   * @param channelId - The ID of the channel for which to calculate the delay.
   * @param messageContent - The content of the message to be sent.
   * @param processingTime - The time taken by the processing step.
   * @returns The calculated delay (in milliseconds) before sending the message.
   */
  public calculateDelay(channelId: string, messageContent: string, processingTime: number): number {
    const currentTime = Date.now();
    const channelInfo = this.channelsTimingInfo[channelId];

    if (!channelInfo || !channelInfo.lastIncomingMessageTime) {
      // No prior incoming message, apply minimum delay minus processing time
      return Math.max(this.minDelay - processingTime, 0);
    }

    const timeSinceLastIncomingMessage = currentTime - channelInfo.lastIncomingMessageTime;
    const recentMessages = this.chatHistory.getRecentMessages(60000); // Last 60 seconds
    const activityMultiplier = Math.pow(1.2, recentMessages.length); // Exponential increase based on activity
    const sizeMultiplier = Math.max(1, messageContent.length / 50); // Longer messages take longer to 'type'

    let delay = Math.exp(this.decayRate * timeSinceLastIncomingMessage / 1000) * this.maxDelay;
    delay = Math.min(Math.max(delay, this.minDelay), this.maxDelay) * activityMultiplier * sizeMultiplier;

    debug(`calculateDelay: Channel ${channelId} calculated delay: ${delay}ms (Processing Time: ${processingTime}ms).`);
    return delay;
  }

  /**
   * Schedules a message to be sent after the calculated delay.
   * Sends typing indicators during the delay period.
   * @param channelId - The ID of the channel to which the message will be sent.
   * @param messageContent - The content of the message to send.
   * @param processingTime - The time taken by the processing step.
   * @param sendFunction - The function to call for sending the message.
   */
  public scheduleMessage(
    channelId: string,
    messageContent: string,
    processingTime: number,
    sendFunction: (message: string) => void
  ): void {
    const delay = this.calculateDelay(channelId, messageContent, processingTime);
    debug(`scheduleMessage: Scheduling message in channel ${channelId} with delay of ${delay}ms.`);

    // Send typing indicators during the delay
    this.sendTypingIndicator(channelId, delay);

    setTimeout(() => {
      sendFunction(messageContent);
      this.logIncomingMessage(channelId); // Log time after sending message
    }, delay);
  }

  /**
   * Sends typing indicators to simulate natural typing behavior during a delay.
   * @param channelId - The ID of the channel where the typing indicator will be sent.
   * @param delay - The delay duration during which typing indicators should be sent.
   */
  private sendTypingIndicator(channelId: string, delay: number): void {
    const typingInterval = 3000; // Send typing indicator every 3 seconds
    const interval = setInterval(() => {
      console.debug(`[MessageDelayScheduler] Sending typing indicator for channel: ${channelId}`);
      // Simulate sending typing indicator here (via Discord API)
    }, typingInterval);

    // Clear typing interval after delay
    setTimeout(() => clearInterval(interval), delay);
  }
}

