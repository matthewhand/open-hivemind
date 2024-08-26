import Debug from "debug";
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
     * Starts the messenger service.
     * @param clientId - The client ID to log in with.
     */
    start(clientId: string): Promise<void>;

    /**
     * Handles an incoming message, determining if an AI response is needed,
     * preparing the request, and sending the response.
     * @param message - The incoming message object.
     */
    handleMessage(message: Message<boolean>): Promise<void>;
}
