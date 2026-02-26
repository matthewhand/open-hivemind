"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMessage = void 0;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:IMessage');
/**
 * Abstract base class representing a message in the messaging system.
 *
 * This class provides a common interface for messages across different platforms
 * (Discord, Slack, etc.) and message types (user messages, bot responses, system messages).
 *
 * @abstract
 * @example
 * ```typescript
 * class DiscordMessage extends IMessage {
 *   // Implementation for Discord-specific messages
 * }
 * ```
 */
class IMessage {
    /**
     * Creates a new IMessage instance.
     *
     * @param {any} data - Raw platform-specific message data
     * @param {string} role - The role of the message sender
     * @param {any} [metadata] - Optional metadata for the message
     * @param {string} [tool_call_id] - Required for tool role messages
     * @param {any[]} [tool_calls] - Optional tool calls for assistant messages
     *
     * @throws {TypeError} If attempting to instantiate IMessage directly
     */
    constructor(data, role, metadata, tool_call_id, tool_calls) {
        /**
         * The text content of the message.
         * @type {string}
         */
        this.content = '';
        /**
         * The unique identifier of the channel where this message was sent.
         * Canonical channel identifier used for routing and prioritization.
         * @type {string}
         */
        this.channelId = '';
        /**
         * The platform this message originated from.
         * Common values: "discord", "slack", "telegram", "mattermost"
         * @type {string}
         */
        this.platform = '';
        if (new.target === IMessage) {
            throw new TypeError('Cannot construct IMessage instances directly');
        }
        this.data = data;
        this.role = role;
        this.metadata = metadata;
        this.tool_call_id = tool_call_id;
        this.tool_calls = tool_calls;
        debug('IMessage initialized with metadata:', metadata, 'tool_call_id:', tool_call_id);
    }
    /**
     * Retrieves the text content or tool response content of the message.
     *
     * For "tool" role messages, returns the content field.
     * Implementations may override this method for custom behavior.
     *
     * @returns {string} The text content of the message
     */
    getText() {
        if (this.role === 'tool') {
            return this.content; // Default to content, override in implementations if needed
        }
        return this.content;
    }
    /**
     * Optional: Returns the guild/workspace identifier if available for the provider.
     * Default contract is to return null when not applicable.
     *
     * Concrete implementations should override to supply a canonical workspace ID where applicable.
     *
     * @returns {string | null}
     */
    getGuildOrWorkspaceId() {
        return null;
    }
    /**
     * Checks if this message is a reply to a bot message.
     *
     * @returns {boolean} True if this message is a reply to a bot
     */
    isReplyToBot() { return false; }
    /**
     * Checks if this message was sent in a direct message (DM) context.
     *
     * @returns {boolean} True if the message is a DM
     */
    isDirectMessage() { return false; }
}
exports.IMessage = IMessage;
