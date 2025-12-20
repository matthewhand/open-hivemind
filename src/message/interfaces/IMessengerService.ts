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
   * Optional: return per-instance startup summaries for operator-friendly logging.
   * Implementations that don't support per-instance introspection can omit this.
   */
  getAgentStartupSummaries?: () => Array<{
    name: string;
    provider: string;
    botId?: string;
    messageProvider?: string;
    llmProvider?: string;
    llmModel?: string;
    llmEndpoint?: string;
    systemPrompt?: string;
  }>;

  /**
   * Optional integration hook: resolve per-agent identity and routing hints.
   *
   * This allows platform-specific logic (multi-bot identity, sender selection, name aliases)
   * to live inside the integration rather than in the message handler.
   *
   * Implementations that don't need this can omit it (or return null).
   */
  resolveAgentContext?(params: {
    botConfig: any;
    agentDisplayName: string;
  }): null | {
    /**
     * Bot/user id for this agent instance (used for mention detection and self-filtering).
     */
    botId?: string;
    /**
     * Provider-specific sender key passed to sendMessageToChannel/sendTyping to select the correct bot instance.
     */
    senderKey?: string;
    /**
     * Candidate names that should count as "spoken to" when typed in plain text.
     */
    nameCandidates?: string[];
  };

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
  sendMessageToChannel(channelId: string, message: string, senderName?: string, threadId?: string, replyToMessageId?: string): Promise<string>;

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
   * Gets the topic/description of a channel.
   * 
   * @param {string} channelId - The channel identifier
   * @returns {Promise<string | null>} The channel topic or null if not available
   */
  getChannelTopic?(channelId: string): Promise<string | null>;

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

  /**
   * Gets the owner/creator of a forum/channel.
   *
   * This method is used by MCP guards to determine channel ownership
   * for permission checks.
   *
   * @param {string} forumId - The forum/channel identifier
   * @returns {Promise<string>} The user ID of the forum/channel owner
   *
   * @example
   * ```typescript
   * const ownerId = await service.getForumOwner("C1234567890");
   * console.log(`Channel owner: ${ownerId}`);
   * ```
   */
  getForumOwner?(forumId: string): Promise<string>;

  /**
   * Optional: Returns extended sub-services managed by this provider.
   * Useful for services like Discord that manage multiple bot instances under one connection.
   * If implemented, consumers like IdleResponseManager can use this to interact with specific bot instances.
   */
  getDelegatedServices?(): Array<{
    serviceName: string;
    messengerService: IMessengerService;
    botConfig: any;
  }>;

  /**
   * Optional: Updates the bot's presence/activity status with model info.
   * For Discord, this updates the "Currently playing" status.
   * 
   * @param {string} modelId - The model identifier to display
   * @param {string} [senderKey] - Optional sender key to identify which bot instance to update
   */
  setModelActivity?(modelId: string, senderKey?: string): Promise<void>;

  /**
   * Optional: Triggers a typing indicator in the channel.
   * Not all platforms support this; implementations may no-op.
   *
   * @param {string} channelId - The channel identifier
   * @param {string} [senderName] - Optional sender key to select a specific bot instance
   * @param {string} [threadId] - Optional thread identifier
   */
  sendTyping?(channelId: string, senderName?: string, threadId?: string): Promise<void>;
}
