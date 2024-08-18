import { Client, Message } from 'discord.js';
import { VoiceConnection } from '@discordjs/voice'; 
import logger from '../utils/logger'; // Ensure logger is correctly imported
import { loginToDiscord } from './utils/loginToDiscord';
import { sendMessageToChannel } from './utils/sendMessageToChannel';
import { setupVoiceChannel } from './utils/setupVoiceChannel';
import { setupEventHandlers } from './utils/setupEventHandlers';
import { playWelcomeMessage } from './utils/playWelcomeMessage';
import { setMessageHandler } from './utils/setMessageHandler'; // Ensure correct import path

/**
 * Class responsible for managing interactions with the Discord API.
 * Implements the Singleton pattern to ensure only one instance of the DiscordManager exists.
 */
class DiscordManager {
    private client: Client;
    private static instance: DiscordManager;

    /**
     * Private constructor to enforce Singleton pattern.
     * Initializes the Discord client with the necessary intents.
     */
    private constructor() {
        logger.info('DiscordManager: Initializing Client with intents: Guilds, GuildMessages, GuildVoiceStates');

        this.client = new Client({
            intents: ['Guilds', 'GuildMessages', 'GuildVoiceStates']
        });

        logger.info('DiscordManager: Client initialized successfully');
    }

    /**
     * Retrieves the singleton instance of DiscordManager.
     * 
     * @returns The singleton instance of DiscordManager.
     */
    public static getInstance(): DiscordManager {
        if (!DiscordManager.instance) {
            logger.info('DiscordManager: Creating a new instance of DiscordManager');
            DiscordManager.instance = new DiscordManager();
        }
        return DiscordManager.instance;
    }

    /**
     * Initializes the Discord client by logging in with the bot token.
     * Sets up event handlers for message creation.
     */
    public async initialize(): Promise<void> {
        logger.info('DiscordManager: Initializing DiscordManager.');

        try {
            const token = process.env.DISCORD_TOKEN || '';
            if (!token) {
                logger.error('DiscordManager: DISCORD_TOKEN is not set, exiting process with code 1');
                process.exit(1);
            }

            logger.info('DiscordManager: Logging in with token...');
            await loginToDiscord(this.client, token);

            logger.info('DiscordManager: Setting up event handlers');
            setupEventHandlers(this.client, this.handleMessage.bind(this));

        } catch (error) {
            const errorMessage = `Error during Discord initialization: ${(error instanceof Error) ? error.message : String(error)}`;
            logger.error(errorMessage);
            process.exit(1);  // Exits the process if the initialization fails
        }
    }

    /**
     * Handles incoming messages.
     * 
     * @param message - The received message.
     */
    private handleMessage(message: Message): void {
        logger.info(`DiscordManager: Received message: ${message.content}`);
    }

    /**
     * Sets the message handler for incoming messages.
     * 
     * @param handler - The function to handle incoming messages.
     */
    public setMessageHandler(handler: (message: Message) => void): void {
        logger.info('DiscordManager: Setting message handler');
        setMessageHandler(this.client, handler);
    }

    /**
     * Sends a message to the specified channel using the Discord client.
     * 
     * @param channelId - The ID of the channel to send the message to.
     * @param message - The message to send.
     * @returns A promise that resolves with the sent message.
     */
    public async sendMessage(channelId: string, message: string): Promise<Message> {
        logger.info(`DiscordManager: Sending a message to channel ID: ${channelId}. Message: ${message}`);
        return sendMessageToChannel(this.client, channelId, message);
    }

    /**
     * Connects the bot to a voice channel and plays a welcome message.
     * 
     * @param channelId - The ID of the voice channel to connect to.
     * @returns A promise that resolves with the VoiceConnection instance.
     */
    public async connectToVoiceChannel(channelId: string): Promise<VoiceConnection> {
        logger.info(`DiscordManager: Connecting to voice channel ID: ${channelId}`);
        const connection = await setupVoiceChannel(this.client, channelId);
        logger.info('DiscordManager: Playing welcome message');
        playWelcomeMessage(connection);
        return connection;
    }
}

export default DiscordManager;
