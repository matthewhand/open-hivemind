import { Client, GatewayIntentBits, PermissionsBitField, ChannelType, Message } from 'discord.js'; // Added Message import
import { generateDependencyReport, joinVoiceChannel, EndBehaviorType, VoiceConnectionStatus, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import logger from '../utils/logger';
import configurationManager from '../config/configurationManager';
import * as discordUtils from '../utils/discordUtils';
import constants from '../config/constants';
import axios from 'axios';
import OpenAI from 'openai';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as util from 'util';

/**
 * Converts Opus audio buffer to WAV format using FFmpeg.
 * Handles errors during conversion and ensures a valid WAV buffer is returned.
 * @param {Buffer} opusBuffer - The buffer containing Opus audio data.
 * @returns {Promise<Buffer>} The buffer containing WAV audio data.
 */
async function convertOpusToWav(opusBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-f', 'opus',
            '-i', 'pipe:0',
            '-f', 'wav',
            'pipe:1'
        ]);

        const output: Buffer[] = [];
        let errorOutput = '';

        ffmpeg.stdout.on('data', (chunk) => {
            output.push(chunk);
            logger.debug('convertOpusToWav: Received chunk of size ' + chunk.length);
        });

        ffmpeg.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        ffmpeg.stdout.on('end', () => {
            const wavBuffer = Buffer.concat(output);
            if (wavBuffer.length === 0) {
                logger.error('convertOpusToWav: Conversion resulted in empty buffer. Error output: ' + errorOutput);
                reject(new Error('Conversion to WAV resulted in empty buffer'));
            } else {
                logger.debug('convertOpusToWav: Converted buffer size ' + wavBuffer.length);
                resolve(wavBuffer);
            }
        });

        ffmpeg.stdout.on('error', (error) => {
            logger.error('convertOpusToWav: ffmpeg stdout error: ' + error.message);
            reject(error);
        });

        ffmpeg.stdin.on('error', (error) => {
            logger.error('convertOpusToWav: ffmpeg stdin error: ' + error.message);
            reject(error);
        });

        ffmpeg.on('close', (code) => {
            if (code !== 0) {
                reject(new Error('convertOpusToWav: ffmpeg process exited with code ' + code + '. Error output: ' + errorOutput));
            }
        });

        const input = new Readable();
        input.push(opusBuffer);
        input.push(null);
        (input as any).pipe(ffmpeg.stdin);
    });
}

/**
 * Manages interactions with the Discord API, including message handling, channel operations, and event responses.
 * Utilizes a singleton pattern to ensure only one instance is used throughout the application.
 */
class DiscordManager {
    private static instance: DiscordManager;
    private client!: Client;
    private typingTimestamps: Map<string, number> = new Map();
    private messageTimestamps: Map<string, number> = new Map();

    /**
     * Constructor for the DiscordManager class.
     * Sets up the Discord client with the necessary intents and initializes event handlers.
     */
    private constructor() {
        if (DiscordManager.instance) {
            return DiscordManager.instance;
        }

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildVoiceStates,
            ],
        });

        this.initialize();
        DiscordManager.instance = this;
    }

    /**
     * Initializes the Discord client and sets up event handlers.
     * Logs an error and exits if the DISCORD_TOKEN is not defined.
     */
    private initialize(): void {
        this.client.once('ready', async () => {
            const botTag = this.client.user?.tag ?? 'unknown';
            logger.info('Bot connected as ' + botTag);
            await this.setupVoiceChannel();
            this.setupEventHandlers();
        });

        const token = configurationManager.getConfig('DISCORD_TOKEN');
        if (!token) {
            logger.error('DISCORD_TOKEN is not defined in the configuration. Exiting...');
            process.exit(1);
        } else {
            this.client.login(token).catch(error => {
                logger.error('Error logging into Discord: ' + (error instanceof Error ? error.message : String(error)));
                process.exit(1);
            });
        }
    }

    /**
     * Sets up event handlers for the Discord client.
     * Add your event handlers here (e.g., messageCreate, interactionCreate).
     */
    private setupEventHandlers(): void {
        this.client.on('messageCreate', (message: Message<boolean>) => {
            logger.info('Message received: ' + message.content);
            // Handle the message here
        });
    }

    /**
     * Sets up the voice channel by joining it and configuring the connection to handle audio streams.
     * Ensures the bot has the necessary permissions and logs relevant information for debugging.
     */
    private async setupVoiceChannel(): Promise<void> {
        const VOICE_CHANNEL_ID = constants.VOICE_CHANNEL_ID;
        if (!VOICE_CHANNEL_ID) {
            logger.warn('VOICE_CHANNEL_ID is not set in the environment variables.');
            return;
        }

        try {
            const channel = await this.client.channels.fetch(VOICE_CHANNEL_ID);
            if (!channel || channel.type !== ChannelType.GuildVoice) {
                logger.error('Channel with ID ' + VOICE_CHANNEL_ID + ' is not a valid voice channel.');
                return;
            }

            const permissions = channel.permissionsFor(this.client.user!);
            if (!permissions) {
                logger.error('Unable to fetch permissions for channel: ' + channel.name);
                return;
            }

            if (!permissions.has(PermissionsBitField.Flags.Connect)) {
                logger.error('Missing CONNECT permission for voice channel: ' + channel.name);
                return;
            }

            if (!permissions.has(PermissionsBitField.Flags.Speak)) {
                logger.error('Missing SPEAK permission for voice channel: ' + channel.name);
                return;
            }

            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });

            connection.on(VoiceConnectionStatus.Ready, async () => {
                logger.info('Successfully connected to the voice channel: ' + channel.name);
                await this.playWelcomeMessage(connection);
            });

            connection.on(VoiceConnectionStatus.Disconnected, () => {
                logger.warn('Disconnected from the voice channel.');
            });

            connection.on('error', error => {
                logger.error('Voice connection error: ' + error.message);
            });

        } catch (error) {
            logger.error('Error setting up voice channel: ' + (error instanceof Error ? error.message : String(error)));
        }
    }

    /**
     * Plays a welcome message when the bot joins a voice channel.
     * @param connection The voice connection to the Discord channel.
     */
    private async playWelcomeMessage(connection: any): Promise<void> {
        // Placeholder for the playWelcomeMessage logic
    }

    /**
     * Assigns a message handler to the DiscordManager instance.
     * @param handler The message handler function to be assigned.
     */
    public setMessageHandler(handler: (message: Message<boolean>) => void): void { // Updated to Message<boolean>
        this.client.on('messageCreate', handler);
    }

    /**
     * Retrieves the singleton instance of DiscordManager, creating it if it does not already exist.
     * @returns {DiscordManager} The singleton instance.
     */
    public static getInstance(): DiscordManager {
        if (!DiscordManager.instance) {
            DiscordManager.instance = new DiscordManager();
        }
        return DiscordManager.instance;
    }
}

export default DiscordManager;
