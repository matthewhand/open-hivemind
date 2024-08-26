import Debug from "debug";

const debug = Debug('app:IMessage');

/**
 * Abstract class representing a standardized message format.
 * This class is intended to be extended with specific implementations as needed.
 */
export abstract class IMessage {
    public content: string = "";  // Added content property
    public client: any;      // Added client property
    public channelId: string = "";  // Added channelId property
    protected data: any;
    public role: string;  // Added role property
    constructor(data: any, role: string) {
        if (new.target === IMessage) {
            throw new TypeError('Cannot construct IMessage instances directly');
        }
        this.data = data;
        this.role = role;
        debug('IMessage initialized with data: ' + JSON.stringify(data));
    }
    /**
     * Retrieves the message ID.
     * @returns {string} The message ID.
     */
    abstract getMessageId(): string;
    /**
     * Retrieves the text content of the message.
     * @returns {string} The text content.
     */
    abstract getText(): string;
    /**
     * Retrieves the channel ID where the message was sent.
     * @returns {string} The channel ID.
     */
    abstract getChannelId(): string;
    /**
     * Retrieves the author ID of the message.
     * @returns {string} The author ID.
     */
    abstract getAuthorId(): string;
    /**
     * Retrieves the topic of the channel.
     * @returns {string | null} The channel topic, or null if not available.
     */
    abstract getChannelTopic(): string | null;
    /**
     * Retrieves the users mentioned in the message.
     * @returns {string[]} Array of mentioned user IDs.
     */
    abstract getUserMentions(): string[];
    /**
     * Retrieves the users in the channel.
     * @returns {string[]} Array of user IDs in the channel.
     */
    abstract getChannelUsers(): string[];
    /**
     * Checks if the message is a reply to the bot.
     * @returns {boolean} True if the message is a reply to the bot, false otherwise.
     */
    isReplyToBot(): boolean {
        return false;
    }
    /**
     * Checks if the message mentions a specific user.
     * @param {string} userId - The ID of the user to check for mentions.
     * @returns {boolean} True if the user is mentioned, false otherwise.
     */
    abstract mentionsUsers(userId: string): boolean;
    /**
     * Checks if the message is from a bot.
     * @returns {boolean} True if the message is from a bot, false otherwise.
     */
    abstract isFromBot(): boolean;
}
