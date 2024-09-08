"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const IMessage_1 = require("@src/message/interfaces/IMessage");
const discord_js_1 = require("discord.js");
const debug = (0, debug_1.default)('app:DiscordMessage');
/**
 * Represents a Discord message, implementing the IMessage interface.
 */
class DiscordMessage extends IMessage_1.IMessage {
    getAuthorName() {
        var _a, _b;
        // Ensure this.message.author exists, then return the username; otherwise, return 'Unknown Author'.
        return ((_b = (_a = this.message) === null || _a === void 0 ? void 0 : _a.author) === null || _b === void 0 ? void 0 : _b.username) || 'Unknown Author';
    }
    /**
     * Constructs an instance of DiscordMessage.
     * @param {Message} message - The raw message object from Discord.
     * @param {Message | null} [repliedMessage=null] - The message this message is replying to, if any.
     */
    constructor(message, repliedMessage = null) {
        super(message, '');
        this.message = message;
        this.repliedMessage = repliedMessage;
        this.content = message.content;
        this.client = message.client;
        this.channelId = message.channelId;
        this.data = message.content;
        this.role = ''; // Set this to the appropriate value based on your application's needs
        debug('[DiscordMessage] Initializing with message ID: ' + message.id);
    }
    /**
     * Gets the ID of the message.
     * @returns {string} - The message ID.
     */
    getMessageId() {
        return this.message.id;
    }
    /**
     * Gets the text content of the message.
     * @returns {string} - The message content.
     */
    getText() {
        return this.message.content;
    }
    /**
     * Gets the ID of the channel where the message was sent.
     * @returns {string} - The channel ID.
     */
    getChannelId() {
        return this.message.channelId;
    }
    /**
     * Gets the topic of the channel where the message was sent.
     * @returns {string} - The channel topic.
     */
    getChannelTopic() {
        if (this.message.channel instanceof discord_js_1.TextChannel) {
            return this.message.channel.topic || '';
        }
        return '';
    }
    /**
     * Gets the ID of the author of the message.
     * @returns {string} - The author's ID.
     */
    getAuthorId() {
        return this.message.author.id;
    }
    /**
     * Retrieves the user mentions in the message.
     * @returns {string[]} An array of user IDs mentioned in the message.
     */
    getUserMentions() {
        return this.message.mentions.users.map(user => user.id);
    }
    /**
     * Retrieves the users in the channel where the message was sent.
     * @returns {string[]} An array of user IDs in the channel.
     */
    getChannelUsers() {
        if (this.message.channel instanceof discord_js_1.TextChannel) {
            const members = this.message.channel.members;
            return Array.from(members.values()).map(member => member.user.id);
        }
        return [];
    }
    /**
     * Checks if the message is from a bot.
     * @returns {boolean} True if the message is from a bot, false otherwise.
     */
    isFromBot() {
        return this.message.author.bot;
    }
    /**
     * Checks if the message is a reply to the bot.
     * @returns {boolean} - True if the message is a reply to the bot.
     */
    isReplyToBot() {
        return !!this.repliedMessage && this.repliedMessage.author.bot;
    }
    /**
     * Checks if the message mentions a specific user.
     * @param {string} userId - The ID of the user to check for mentions.
     * @returns {boolean} True if the user is mentioned, false otherwise.
     */
    mentionsUsers(userId) {
        return this.message.mentions.users.has(userId);
    }
    /**
     * Gets the original `discord.js` Message object.
     * This method is specific to the Discord implementation and is not part of the `IMessage` interface.
     * @returns {Message} - The original `discord.js` Message object.
     */
    getOriginalMessage() {
        return this.message;
    }
}
exports.default = DiscordMessage;
