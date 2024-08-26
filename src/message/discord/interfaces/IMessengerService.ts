import Debug from "debug";
import { Message } from 'discord.js';

/**
 * Interface defining the contract for a messenger service.
 */
export interface IMessengerService {
    /**
     * Initializes the messenger service.
     */
    initialize(): Promise<void>;

    /**
     * Starts the messenger service.
     * @param clientId - The client ID to log in with.
     */
    start(clientId: string): Promise<void>;

    /**
     * Handles an incoming message.
     * @param message - The incoming message object.
     */
    handleMessage(message: Message<boolean>): Promise<void>;
}
