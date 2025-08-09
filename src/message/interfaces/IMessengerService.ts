import { IMessage } from './IMessage';

/**
 * High-level interface for messaging services across different platforms.
 *
 * This interface provides a unified API for messaging operations across
 * different platforms (Discord, Slack, Mattermost, etc.). It abstracts
 * platform-specific details while providing common messaging functionality.
 *
 * @interface
 * @example
 * ```typescript
 * class DiscordService implements IMessengerService {
 *   async initialize() {
 *     // Discord-specific initialization
 *   }
 *
 *   async sendMessageToChannel(channelId, message) {
 *     // Discord message sending
 *   }
 * }
 * ```
 */
export interface IMessengerService {
  /**
   * Initializes the messaging service.
   *
   * This method should handle authentication, connection setup,
   * and any platform-specific initialization requirements.
   *
   * @returns {Promise<void>} A promise that resolves when initialization is complete
   *
   * @example
   * ```typescript
   * await service.initialize();
   * console.log('Service initialized successfully');
   * ```
   */
  initialize(): Promise<void>;

  /**
   * Sends a message to a specific channel.
   *
   * @param {string} channelId - The target channel identifier
   * @param {string} message - The message content to send
   * @param {string} [senderName] - Optional display name for the message sender
   * @param {string} [threadId] - Optional thread ID for replying to threads
   * @returns {Promise<string>} A promise that resolves to the sent message's ID
   *
   * @example
   * ```typescript
   * const messageId = await service.sendMessageToChannel(
   *   "general",
   *   "Hello everyone!",
   *   "Bot Assistant"
   * );
   * ```
   */
  sendMessageToChannel(channelId: string, message: string, senderName?: string, threadId?: string): Promise<string>;

  /**
   * Retrieves messages from a specific channel.
   *
   * @param {string} channelId - The channel identifier to fetch messages from
   * @returns {Promise<IMessage[]>} A promise that resolves to an array of messages
   *
   * @example
   * ```typescript
   * const messages = await service.getMessagesFromChannel("general");
   * messages.forEach(msg => console.log(msg.getText()));
   * ```
   */
  getMessagesFromChannel(channelId: string): Promise<IMessage[]>;

  /**
   * Sends a public announcement to a channel.
   *
   * This method is typically used for important notifications or broadcasts
   * that should be highlighted or formatted differently from regular messages.
   *
   * @param {string} channelId - The target channel identifier
   * @param {any} announcement - The announcement content (format depends on platform)
   * @returns {Promise<void>} A promise that resolves when the announcement is sent
   *
   * @example
   * ```typescript
   * await service.sendPublicAnnouncement("general", {
   *   title: "System Update",
   *   message: "The system will be updated at 3 PM"
   * });
   * ```
   */
  sendPublicAnnouncement(channelId: string, announcement: any): Promise<void>;

  /**
   * Gets the unique client identifier for this service.
   *
   * @returns {string} The client ID (typically bot user ID)
   */
  getClientId(): string;

  /**
   * Gets the default channel identifier for this service.
   *
   * @returns {string} The default channel ID
   */
  getDefaultChannel(): string;

  /**
   * Shuts down the messaging service gracefully.
   *
   * This method should handle cleanup, connection closing, and
   * any necessary shutdown procedures.
   *
   * @returns {Promise<void>} A promise that resolves when shutdown is complete
   */
  shutdown(): Promise<void>;

  /**
   * Indicates whether the service supports channel prioritization/scoring.
   * If true, the service may provide a custom scoreChannel implementation.
   */
  supportsChannelPrioritization?: boolean;

  /**
   * Optional: compute a score for a given channel on this platform.
   * Higher scores indicate more preferred channels for routing.
   * Implementations can delegate to ChannelRouter under the hood.
   *
   * @param channelId The channel identifier to score
   * @param metadata  Optional context used for scoring
   * @returns number score for the channel
   */
  scoreChannel?(channelId: string, metadata?: Record<string, any>): number;

  /**
   * Sets the message handler for processing incoming messages.
   *
   * @param {(message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>} handler -
   *        The handler function that processes incoming messages
   *
   * @example
   * ```typescript
   * service.setMessageHandler(async (message, history, config) => {
   *   // Process the message
   *   const response = await generateResponse(message, history);
   *   return response;
   * });
   * ```
   */
  setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>): void;
}
