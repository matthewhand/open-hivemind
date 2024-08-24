import { Client, Message } from 'discord.js';
import { VoiceConnection } from '@discordjs/voice'; 
import logger from '@src/utils/logger';
import { loginToDiscord } from './utils/loginToDiscord';
import { sendMessageToChannel } from './utils/sendMessageToChannel';
import { setupVoiceChannel } from './utils/setupVoiceChannel';
import { setupEventHandlers } from './utils/setupEventHandlers';
import { playWelcomeMessage } from './utils/playWelcomeMessage';
import { setMessageHandler } from './utils/setMessageHandler';

class DiscordManager {
    private client: Client;
    private static instance: DiscordManager;

    public constructor() {
        logger.info('DiscordManager: Initializing Client with intents: Guilds, GuildMessages, GuildVoiceStates');
        this.client = new Client({
            intents: ['Guilds', 'GuildMessages', 'GuildVoiceStates']
        });
        logger.info('DiscordManager: Client initialized successfully');
    }

    public static getInstance(): DiscordManager {
        if (!DiscordManager.instance) {
            logger.info('DiscordManager: Creating a new instance of DiscordManager');
            DiscordManager.instance = new DiscordManager();
        }
        return DiscordManager.instance;
    }

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
            setupEventHandlers(this.client, async (message, history) => { this.handleMessage(message); }, new Map(), async (channelId) => []);

        } catch (error: any) {
            const errorMessage = `Error during Discord initialization: ${(error instanceof Error) ? error.message : String(error)}`;
            logger.error(errorMessage);
            process.exit(1);  // Exits the process if the initialization fails
        }
    }

    public async start(clientId: string): Promise<void> {
        try {
            await this.client.login(clientId);
            this.client.once('ready', () => {
                console.log(`Logged in as ${this.client.user?.tag}!`);
            });

            this.client.on('error', (error) => {
                console.error('Discord client error:', error);
            });

        } catch (error) {
            console.error('Failed to start DiscordManager:', error);
        }
    }

    private handleMessage(message: Message): void {
        logger.info(`DiscordManager: Received message: ${message.content}`);
    }

    public setMessageHandler(handler: (message: Message) => void): void {
        logger.info('DiscordManager: Setting message handler');
        setMessageHandler(handler);
    }

    public async sendMessageToChannel(channelId: string, message: string): Promise<Message> {
        logger.info(`DiscordManager: Sending a message to channel ID: ${channelId}. Message: ${message}`);
        return sendMessageToChannel(this.client, channelId, message);
    }

    public async connectToVoiceChannel(channelId: string): Promise<VoiceConnection> {
        logger.info(`DiscordManager: Connecting to voice channel ID: ${channelId}`);
        const connection = await setupVoiceChannel(this.client);
        logger.info('DiscordManager: Playing welcome message');
        if (connection) { playWelcomeMessage(connection); }
        return connection!;
    }
}

export default DiscordManager;
