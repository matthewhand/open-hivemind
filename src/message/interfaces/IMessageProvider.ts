// IMessageProvider.ts

/**
 * IMessageProvider Interface
 * Defines the methods for sending messages and managing bot interactions across platforms.
 */
export interface IMessageProvider {
    /**
     * Sends a message to a specific channel.
     * @param channelId - The ID of the channel to send the message to.
     * @param message - The content of the message to be sent.
     * @returns A Promise that resolves when the message is successfully sent.
     */
    sendMessageToChannel(channelId: string, message: string, active_agent_name?: string): Promise<void>;

    /**
     * Retrieves the bot's client ID.
     * @returns The bot's client ID as a string.
     */
    getClientId(): string;
}
