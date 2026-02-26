import type { IMessage } from '@src/message/interfaces/IMessage';
import type { Message } from 'discord.js';
/**
 * Discord-specific implementation of the IMessage interface.
 *
 * This class wraps the Discord.js Message object to provide a unified interface
 * for Discord messages while maintaining compatibility with the IMessage contract.
 * It handles Discord-specific features like mentions, channel topics, and message editing.
 *
 * @implements {IMessage}
 * @example
 * ```typescript
 * const discordMessage = new DiscordMessage(message);
 * console.log(discordMessage.getText()); // "Hello from Discord!"
 * console.log(discordMessage.getAuthorName()); // "username#1234"
 * ```
 */
export declare class DiscordMessage implements IMessage {
    static DiscordMessage: typeof DiscordMessage;
    /**
     * The text content of the Discord message.
     * @type {string}
     */
    content: string;
    /**
     * The Discord channel ID where this message was sent.
     * @type {string}
     */
    channelId: string;
    /**
     * Raw Discord.js message data.
     * Contains the original Message object from discord.js.
     * @type {Message<boolean>}
     */
    data: Message<boolean>;
    /**
     * The role of the message sender (user, assistant, system, tool).
     * @type {string}
     */
    role: string;
    /**
     * The platform this message originated from.
     * @type {string}
     */
    platform: string;
    /**
     * Metadata for cross-platform compatibility.
     * Includes replyTo information for reply detection.
     * @type {any}
     */
    metadata: any;
    /**
     * The underlying Discord.js Message object.
     * @private
     * @type {Message<boolean>}
     */
    private readonly message;
    /**
     * The message that this message is replying to, if any.
     * @private
     * @type {Message<boolean> | null}
     */
    private readonly repliedMessage;
    /**
     * Creates a new DiscordMessage instance.
     *
     * @param {Message<boolean>} message - The raw message object from Discord.js
     * @param {Message<boolean> | null} [repliedMessage=null] - The message this message is replying to, if any
     *
     * @example
     * ```typescript
     * const message = new DiscordMessage(discordJsMessage);
     * const reply = new DiscordMessage(replyMessage, originalMessage);
     * ```
     */
    constructor(message: Message<boolean>, repliedMessage?: Message<boolean> | null);
    /**
     * Gets the unique Discord message ID.
     *
     * @returns {string} The Discord message ID
     */
    getMessageId(): string;
    /**
     * Gets the text content of the Discord message.
     *
     * @returns {string} The message text content
     */
    getText(): string;
    /**
     * Gets the timestamp when this Discord message was created.
     *
     * @returns {Date} The message creation timestamp
     */
    getTimestamp(): Date;
    /**
     * Updates the text content of the Discord message.
     *
     * Note: This will attempt to edit the original Discord message if it's editable.
     *
     * @param {string} text - The new text content
     */
    setText(text: string): Promise<void>;
    /**
     * Gets the Discord channel ID.
     *
     * @returns {string} The Discord channel ID
     */
    getChannelId(): string;
    /**
     * Gets the topic/description of the Discord channel.
     *
     * @returns {string | null} The channel topic, or null if not available or not a text channel
     */
    getChannelTopic(): string | null;
    /**
     * Gets the Discord user ID of the message author.
     *
     * @returns {string} The author's Discord user ID
     */
    getAuthorId(): string;
    /**
     * Gets all user mentions in this Discord message.
     *
     * @returns {string[]} Array of Discord user IDs mentioned in the message
     */
    getUserMentions(): string[];
    /**
     * Gets all users in the Discord channel.
     *
     * @returns {string[]} Array of Discord user IDs in the channel
     */
    getChannelUsers(): string[];
    /**
     * Gets the display name of the Discord message author.
     *
     * @returns {string} The author's Discord username
     */
    getAuthorName(): string;
    /**
     * Checks if this Discord message was sent by a bot.
     *
     * @returns {boolean} True if the message is from a bot user
     */
    isFromBot(): boolean;
    /**
     * Checks whether this message is a reply (to any message).
     * Useful for generic reply-aware logic across providers.
     */
    isReply(): boolean;
    /**
     * Checks if this message is mentioning a specific user ID.
     * This is a convenience wrapper used by some helper modules.
     */
    isMentioning(userId: string): boolean;
    /**
     * Checks if this Discord message is a reply to a bot message.
     *
     * @returns {boolean} True if this message is a reply to a bot
     */
    isReplyToBot(): boolean;
    /**
     * Checks if this Discord message mentions a specific user.
     *
     * @param {string} userId - The Discord user ID to check for
     * @returns {boolean} True if the user is mentioned in this message
     */
    mentionsUsers(userId: string): boolean;
    /**
     * Returns the Discord guild ID (workspace) if available, else null.
     * Satisfies IMessage.getGuildOrWorkspaceId() for cross-platform routing.
     */
    getGuildOrWorkspaceId(): string | null;
    /**
     * Gets the underlying Discord.js Message object.
     *
     * @returns {Message<boolean>} The original Discord.js message
     */
    getOriginalMessage(): Message<boolean>;
    /**
     * Checks if this message was sent in a direct message (DM) context.
     *
     * @returns {boolean} True if the message is a DM
     */
    isDirectMessage(): boolean;
    /**
     * Retrieves the Discord message being referenced (e.g., in replies).
     *
     * @returns {Promise<IMessage | null>} The referenced message as an IMessage, or null if none exists
     */
    getReferencedMessage(): Promise<IMessage | null>;
    /**
     * Checks if the message has attachments.
     * @returns {boolean} True if the message has attachments, false otherwise.
     */
    hasAttachments(): boolean;
}
export default DiscordMessage;
//# sourceMappingURL=DiscordMessage.d.ts.map