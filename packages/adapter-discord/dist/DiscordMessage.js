"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordMessage = void 0;
// src/integrations/discord/DiscordMessage.ts
const debug_1 = __importDefault(require("debug"));
const discord_js_1 = require("discord.js");
const errors_1 = require("@types/errors");
const debug = (0, debug_1.default)('app:DiscordMessage');
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
class DiscordMessage {
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
    constructor(message, repliedMessage = null) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        this.message = message;
        this.repliedMessage = repliedMessage;
        this.content = message.content || '[No content]'; // Ensure fallback for empty content
        this.channelId = message.channelId;
        this.data = message;
        // Role calculation:
        // If the author is THIS bot (the client user), role is 'assistant'.
        // Everyone else (humans AND other bots) is 'user'.
        this.role = (message.author.id === ((_b = (_a = message.client) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id)) ? 'assistant' : 'user';
        this.platform = 'discord';
        // Populate metadata for reply detection
        if (repliedMessage) {
            this.metadata = {
                replyTo: {
                    userId: ((_c = repliedMessage.author) === null || _c === void 0 ? void 0 : _c.id) || null,
                    username: ((_d = repliedMessage.author) === null || _d === void 0 ? void 0 : _d.username) || null,
                    messageId: repliedMessage.id || null,
                    isBot: ((_e = repliedMessage.author) === null || _e === void 0 ? void 0 : _e.bot) || false,
                },
            };
        }
        else {
            this.metadata = {};
        }
        const author = message.author;
        const authorString = `${(_f = author.username) !== null && _f !== void 0 ? _f : 'unknown'}#${(_g = author.discriminator) !== null && _g !== void 0 ? _g : '0000'} (${(_h = author.id) !== null && _h !== void 0 ? _h : 'unknown'})`;
        debug(`DiscordMessage: [ID: ${message.id}] by ${authorString}${repliedMessage ? ` (reply to ${(_j = repliedMessage.author) === null || _j === void 0 ? void 0 : _j.id})` : ''}`);
    }
    /**
     * Gets the unique Discord message ID.
     *
     * @returns {string} The Discord message ID
     */
    getMessageId() {
        const messageId = this.message.id || 'unknown';
        debug('Getting message ID: ' + messageId);
        return messageId;
    }
    /**
     * Gets the text content of the Discord message.
     *
     * @returns {string} The message text content
     */
    getText() {
        var _a;
        const text = String((_a = this.content) !== null && _a !== void 0 ? _a : '');
        const previewMax = 60;
        const normalized = text.replace(/\s+/g, ' ').trim();
        const preview = normalized.length > previewMax ? `${normalized.slice(0, previewMax)}...` : normalized;
        debug(`Getting message text (len=${text.length}): ${preview}`);
        return this.content;
    }
    /**
     * Gets the timestamp when this Discord message was created.
     *
     * @returns {Date} The message creation timestamp
     */
    getTimestamp() {
        debug('Getting timestamp for message: ' + this.message.id);
        return this.message.createdAt;
    }
    /**
     * Updates the text content of the Discord message.
     *
     * Note: This will attempt to edit the original Discord message if it's editable.
     *
     * @param {string} text - The new text content
     */
    setText(text) {
        debug('Setting message text: ' + text);
        this.content = text;
        if (this.message.editable) {
            return this.message.edit(text).then(() => {
                // use debug to avoid noisy console during tests
                debug(`Message ${this.message.id} edited successfully.`);
            }).catch((error) => {
                debug(`Failed to edit message ${this.message.id}: ${errors_1.ErrorUtils.getMessage(error)}`);
                throw error;
            });
        }
        else {
            // downgrade to debug to silence console.warn in tests
            debug(`Message ${this.message.id} is not editable.`);
            return Promise.resolve();
        }
    }
    /**
     * Gets the Discord channel ID.
     *
     * @returns {string} The Discord channel ID
     */
    getChannelId() {
        debug('Getting channel ID: ' + this.channelId);
        return this.channelId;
    }
    /**
     * Gets the topic/description of the Discord channel.
     *
     * @returns {string | null} The channel topic, or null if not available or not a text channel
     */
    getChannelTopic() {
        debug('Getting channel topic for channel: ' + this.channelId);
        try {
            // Handle both real TextChannel and mock objects
            const channel = this.message.channel;
            if (channel instanceof discord_js_1.TextChannel) {
                return channel.topic || null;
            }
            // Handle mock objects that might have a topic property
            if (channel && typeof channel === 'object' && 'topic' in channel) {
                return channel.topic || null;
            }
            return null;
        }
        catch (error) {
            debug('Error getting channel topic:', errors_1.ErrorUtils.getMessage(error));
            return null;
        }
    }
    /**
     * Gets the Discord user ID of the message author.
     *
     * @returns {string} The author's Discord user ID
     */
    getAuthorId() {
        debug('Getting author ID: ' + this.message.author.id);
        return this.message.author.id;
    }
    /**
     * Gets all user mentions in this Discord message.
     *
     * @returns {string[]} Array of Discord user IDs mentioned in the message
     */
    getUserMentions() {
        var _a;
        debug('Getting user mentions from message: ' + this.message.id);
        try {
            const users = (_a = this.message.mentions) === null || _a === void 0 ? void 0 : _a.users;
            if (!users) {
                return [];
            }
            if (users instanceof discord_js_1.Collection) {
                return Array.from(users.values())
                    .map((user) => user.id)
                    .filter((id) => typeof id === 'string');
            }
            // Handle mock objects that might be plain arrays or objects
            const usersAny = users;
            // Plain array of users or IDs
            if (Array.isArray(usersAny)) {
                return usersAny
                    .map((u) => (typeof u === 'string' ? u : u === null || u === void 0 ? void 0 : u.id))
                    .filter((id) => typeof id === 'string');
            }
            // Some tests may mock mentions.users as a plain object map
            if (typeof usersAny === 'object' && usersAny !== null) {
                return Object.values(usersAny)
                    .map((u) => (typeof u === 'string' ? u : u === null || u === void 0 ? void 0 : u.id))
                    .filter((id) => typeof id === 'string');
            }
            return [];
        }
        catch (error) {
            debug('Error getting user mentions:', errors_1.ErrorUtils.getMessage(error));
            return [];
        }
    }
    /**
     * Gets all users in the Discord channel.
     *
     * @returns {string[]} Array of Discord user IDs in the channel
     */
    getChannelUsers() {
        debug('Fetching users from channel: ' + this.channelId);
        try {
            const channel = this.message.channel;
            if (!channel) {
                return [];
            }
            // Try to get members from guild channel
            const guildChannel = channel;
            const members = guildChannel.members;
            if (!members) {
                return [];
            }
            if (members instanceof discord_js_1.Collection) {
                return Array.from(members.values())
                    .map((m) => { var _a; return (_a = m.user) === null || _a === void 0 ? void 0 : _a.id; })
                    .filter((id) => typeof id === 'string');
            }
            // Handle mock objects
            const membersAny = members;
            // Array of members
            if (Array.isArray(membersAny)) {
                return membersAny
                    .map((m) => { var _a; return (typeof m === 'string' ? m : (_a = m === null || m === void 0 ? void 0 : m.user) === null || _a === void 0 ? void 0 : _a.id); })
                    .filter((id) => typeof id === 'string');
            }
            // Plain object map for test mocks
            if (typeof membersAny === 'object' && membersAny !== null) {
                // Handle object with map function (test mocks)
                const mockCollection = membersAny;
                if (typeof mockCollection.map === 'function') {
                    const mapped = mockCollection.map((m) => { var _a; return (_a = m === null || m === void 0 ? void 0 : m.user) === null || _a === void 0 ? void 0 : _a.id; });
                    return (Array.isArray(mapped) ? mapped : []).filter((id) => typeof id === 'string');
                }
                // Handle plain object
                return Object.values(membersAny)
                    .map((m) => { var _a; return (typeof m === 'string' ? m : (_a = m === null || m === void 0 ? void 0 : m.user) === null || _a === void 0 ? void 0 : _a.id); })
                    .filter((id) => typeof id === 'string');
            }
            return [];
        }
        catch (error) {
            debug('Error getting channel users:', errors_1.ErrorUtils.getMessage(error));
            return [];
        }
    }
    /**
     * Gets the display name of the Discord message author.
     *
     * @returns {string} The author's Discord username
     */
    getAuthorName() {
        const authorName = this.message.author.username || 'Unknown Author';
        debug('Author name: ' + authorName);
        return authorName;
    }
    /**
     * Checks if this Discord message was sent by a bot.
     *
     * @returns {boolean} True if the message is from a bot user
     */
    isFromBot() {
        var _a, _b;
        const isBot = ((_a = this.message.author) === null || _a === void 0 ? void 0 : _a.bot) || false;
        // ASCII-ify author name for clean terminal output (strip emojis/non-ASCII)
        const cleanName = (((_b = this.message.author) === null || _b === void 0 ? void 0 : _b.username) || 'unknown').replace(/[^\x20-\x7E]/g, '').substring(0, 20);
        debug(`isFromBot: ${cleanName} → ${isBot}`);
        return isBot;
    }
    /**
     * Checks whether this message is a reply (to any message).
     * Useful for generic reply-aware logic across providers.
     */
    isReply() {
        var _a, _b;
        try {
            return Boolean((_b = (_a = this.message) === null || _a === void 0 ? void 0 : _a.reference) === null || _b === void 0 ? void 0 : _b.messageId);
        }
        catch (_c) {
            return false;
        }
    }
    /**
     * Checks if this message is mentioning a specific user ID.
     * This is a convenience wrapper used by some helper modules.
     */
    isMentioning(userId) {
        try {
            return this.mentionsUsers(userId);
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Checks if this Discord message is a reply to a bot message.
     *
     * @returns {boolean} True if this message is a reply to a bot
     */
    isReplyToBot() {
        var _a;
        if (this.repliedMessage) {
            const isBot = ((_a = this.repliedMessage.author) === null || _a === void 0 ? void 0 : _a.bot) || false;
            debug(`Is reply to bot: ${isBot}`);
            return isBot;
        }
        debug('No replied message found.');
        return false;
    }
    /**
     * Checks if this Discord message mentions a specific user.
     *
     * @param {string} userId - The Discord user ID to check for
     * @returns {boolean} True if the user is mentioned in this message
     */
    mentionsUsers(userId) {
        debug('Checking if message mentions user: ' + userId);
        if (!this.message.mentions || !this.message.mentions.users) {
            return false;
        }
        return this.message.mentions.users.has(userId);
    }
    /**
     * Returns the Discord guild ID (workspace) if available, else null.
     * Satisfies IMessage.getGuildOrWorkspaceId() for cross-platform routing.
     */
    getGuildOrWorkspaceId() {
        var _a, _b, _c;
        try {
            // message.guild may be undefined in DMs or certain mocks
            const guildId = (_c = (_b = (_a = this.message) === null || _a === void 0 ? void 0 : _a.guild) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : null;
            return guildId;
        }
        catch (_d) {
            return null;
        }
    }
    /**
     * Gets the underlying Discord.js Message object.
     *
     * @returns {Message<boolean>} The original Discord.js message
     */
    getOriginalMessage() {
        return this.message;
    }
    /**
     * Checks if this message was sent in a direct message (DM) context.
     *
     * @returns {boolean} True if the message is a DM
     */
    isDirectMessage() {
        try {
            // In Discord.js v13/v14, ChannelType.DM is 1. 
            // We can also check if guild is null/undefined.
            if (!this.message.guildId && !this.message.guild) {
                return true;
            }
            // Or check typestring if available (older djs) or type enum
            const type = this.message.channel.type;
            // 1 is DM, 3 is GroupDM.
            return type === 1 || type === 3 || type === 'DM';
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Retrieves the Discord message being referenced (e.g., in replies).
     *
     * @returns {Promise<IMessage | null>} The referenced message as an IMessage, or null if none exists
     */
    async getReferencedMessage() {
        if (this.message.reference && this.message.reference.messageId) {
            try {
                const referencedMsg = await this.message.channel.messages.fetch(this.message.reference.messageId);
                return new DiscordMessage(referencedMsg);
            }
            catch (error) {
                // use debug instead of console.error to reduce test noise
                debug(`Failed to fetch referenced message: ${errors_1.ErrorUtils.getMessage(error)}`);
                return null;
            }
        }
        return null;
    }
    /**
     * Checks if the message has attachments.
     * @returns {boolean} True if the message has attachments, false otherwise.
     */
    hasAttachments() {
        return this.message.attachments.size > 0;
    }
}
exports.DiscordMessage = DiscordMessage;
DiscordMessage.DiscordMessage = DiscordMessage;
exports.default = DiscordMessage;
