import { Client, GatewayIntentBits, Message } from 'discord.js';
import { VoiceConnection } from '@discordjs/voice'; 
import logger from '@src/utils/logger';
import { loginToDiscord } from './utils/loginToDiscord';
import { sendMessageToChannel } from './utils/sendMessageToChannel';
import { setupVoiceChannel } from './utils/setupVoiceChannel';
import { playWelcomeMessage } from './utils/playWelcomeMessage';
import { setMessageHandler } from './utils/setMessageHandler';
import { IMessage } from '@src/message/interfaces/IMessage';
import { shouldReplyToMessage } from '@src/message/responseManager/shouldReplyToMessage';
import { LLMInterface } from '@src/llm/LLMInterface';
import constants from '@config/ConfigurationManager';
import { prepareMessageBody } from '@src/message/messageProcessing/prepareMessageBody';
import { summarizeMessage } from '@src/message/messageProcessing/summarizeMessage';
import { sendFollowUp } from '@src/message/followUp/sendFollowUp';

class DiscordManager {
    private client: Client;
    private static instance: DiscordManager;

    private constructor() {
        logger.info('DiscordManager: Initializing Client with intents: Guilds, GuildMessages, GuildVoiceStates');
        this.client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates]
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
            setMessageHandler(this.client, async (message: Message): Promise<void> => {
                await this.handleMessage(message);
            }, new Map<string, number>(), async (channelId: string) => []);

        } catch (error: any) {
            const errorMessage = 'Error during Discord initialization: ' + ((error instanceof Error) ? error.message : String(error));
            logger.error(errorMessage);
            process.exit(1);  // Exits the process if the initialization fails
        }
    }

    public async start(clientId: string): Promise<void> {
        try {
            await this.client.login(clientId);
            this.client.once('ready', () => {
                console.log('Logged in as ' + this.client.user?.tag + '!');
            });

            this.client.on('error', (error) => {
                console.error('Discord client error:', error);
            });

        } catch (error) {
            console.error('Failed to start DiscordManager:', error);
        }
    }

    private async handleMessage(message: IMessage): Promise<void> {
        logger.info('DiscordManager: Received message: ' + message.content);
        if (!shouldReplyToMessage(message)) {
            logger.info('[DiscordManager] No AI response needed.');
            return;
        }

        const llmManager = LLMInterface.getManager();
        if (llmManager.isBusy()) {
            logger.info('[DiscordManager] LLM Manager is busy.');
            return;
        }

        let requestBody;
        try {
            requestBody = await prepareMessageBody(
                constants.LLM_SYSTEM_PROMPT,
                message.channelId,
                []
            );
        } catch (error: any) {
            logger.error('[DiscordManager] Error preparing LLM request body:', error);
            return;
        }

        let llmResponse;
        try {
            llmResponse = await llmManager.sendRequest(requestBody);
        } catch (error: any) {
            logger.error('[DiscordManager] Error sending LLM request:', error);
            return;
        }

        let responseContent;
        try {
            responseContent = llmResponse.getContent();

            if (typeof responseContent !== 'string') {
                throw new Error('Expected string from LLM response, received: ' + typeof responseContent);
            }

            const finishReason = llmResponse.getFinishReason();
            if (finishReason !== 'stop') {
                throw new Error('LLM response finished with reason: ' + finishReason);
            }

            if (!responseContent.trim()) {
                throw new Error('LLM provided an empty or invalid response.');
            }

            if (responseContent.length > constants.MAX_MESSAGE_LENGTH) {
                responseContent = await summarizeMessage(responseContent);
            }
        } catch (error: any) {
            logger.error('[DiscordManager] Error processing LLM response content:', error);
            return;
        }

        try {
            await this.sendMessageToChannel(message.channelId, responseContent);
        } catch (error: any) {
            logger.error('[DiscordManager] Error sending response to channel:', error);
            return;
        }

        if (constants.FOLLOW_UP_ENABLED) {
            try {
        if (constants.FOLLOW_UP_ENABLED) {
        try {
                logger.error('[DiscordManager] Error initiating follow-up interaction:', error);
            }
        }
        } catch (error: any) {

        }
        logger.info('DiscordManager: Setting message handler');
        setMessageHandler(this.client, handler, new Map<string, number>(), async (channelId: string) => []);
    }

    public async sendMessageToChannel(channelId: string, message: string): Promise<Message | void> {
        logger.info('DiscordManager: Sending a message to channel ID: ' + channelId + '. Message: ' + message);
        return sendMessageToChannel(this.client, channelId, message);
    }

    public async connectToVoiceChannel(channelId: string): Promise<VoiceConnection> {
        logger.info('DiscordManager: Connecting to voice channel ID: ' + channelId);
        const connection = await setupVoiceChannel(this.client);
        logger.info('DiscordManager: Playing welcome message');
        if (connection) { playWelcomeMessage(connection); }
        return connection!;
    }
}

export default DiscordManager;
