import { Message } from 'discord.js';

/**
 * Interface representing a messenger service for handling Discord interactions.
 */
export interface IMessengerService {
    /**
     * Initializes the service by logging in and setting up event handlers.
     * Exits the process if initialization fails.
     */
    initialize(): Promise<void>;

    /**
     * Starts the Discord client and logs in with the provided client ID.
     * @param clientId - The Discord client ID.
     */
    start(clientId: string): Promise<void>;

    /**
     * Handles incoming messages, determining if an AI response is needed,
     * preparing the request, and sending the response.
     * @param message - The incoming message.
     */
    handleMessage(message: Message): Promise<void>;
}
