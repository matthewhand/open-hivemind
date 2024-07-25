const { Client, GatewayIntentBits, PermissionsBitField, ChannelType } = require('discord.js');
const { generateDependencyReport } = require('@discordjs/voice');
const logger = require('../utils/logger');
const configurationManager = require('../config/configurationManager');
const discordUtils = require('../utils/discordUtils');
const DiscordMessage = require('../models/DiscordMessage');
const constants = require('../config/constants'); // Assuming this contains CLIENT_ID
const { joinVoiceChannel, EndBehaviorType, VoiceConnectionStatus, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const axios = require('axios');
// const FormData = require('form-data');
const util = require('util');
const OpenAI = require('openai');
const { spawn } = require('child_process');
const { Readable } = require('stream');
const fs = require('fs');

/**
 * Converts Opus audio buffer to WAV format using FFmpeg.
 * @param {Buffer} opusBuffer - The buffer containing Opus audio data.
 * @returns {Promise<Buffer>} The buffer containing WAV audio data.
 */
async function convertOpusToWav(opusBuffer) {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-f', 'opus',        // Specify input format
            '-i', 'pipe:0',      // Read input from pipe
            '-f', 'wav',         // Specify output format
            'pipe:1'             // Write output to pipe
        ]);

        const output = [];
        let errorOutput = '';

        ffmpeg.stdout.on('data', (chunk) => {
            output.push(chunk);
            logger.debug(`convertOpusToWav: Received chunk of size ${chunk.length}`);
        });

        ffmpeg.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        ffmpeg.stdout.on('end', () => {
            const wavBuffer = Buffer.concat(output);
            if (wavBuffer.length === 0) {
                logger.error(`convertOpusToWav: Conversion resulted in empty buffer. Error output: ${errorOutput}`);
                reject(new Error('Conversion to WAV resulted in empty buffer'));
            } else {
                logger.debug(`convertOpusToWav: Converted buffer size ${wavBuffer.length}`);
                resolve(wavBuffer);
            }
        });

        ffmpeg.stdout.on('error', (error) => {
            logger.error(`convertOpusToWav: ffmpeg stdout error: ${error.message}`);
            reject(error);
        });

        ffmpeg.stdin.on('error', (error) => {
            logger.error(`convertOpusToWav: ffmpeg stdin error: ${error.message}`);
            reject(error);
        });

        ffmpeg.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`convertOpusToWav: ffmpeg process exited with code ${code}. Error output: ${errorOutput}`));
            }
        });

        const input = new Readable();
        input.push(opusBuffer);
        input.push(null);
        input.pipe(ffmpeg.stdin);
    });
}

/**
 * Manages interactions with the Discord API, facilitating message handling, channel operations, and event responses.
 * Utilizes a singleton pattern to ensure only one instance is used throughout the application.
 */
class DiscordManager {
    static instance;
    client;
    typingTimestamps = new Map(); // Maps channel IDs to the last typing timestamp

    /**
     * Constructs the DiscordManager instance, setting up the client with necessary intents.
     */
    constructor() {
        if (DiscordManager.instance) {
            return DiscordManager.instance;
        }
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildVoiceStates, // Add this line to handle voice state updates
            ],
        });
        this.initialize();
        DiscordManager.instance = this;

        this.messageTimestamps = new Map();
    }

    /**
     * Initializes the Discord client and sets up event handlers for the bot.
     */
    initialize() {
        this.client.once('ready', async () => {
            logger.info(`Bot connected as ${this.client.user.tag}`);
            await this.setupVoiceChannel(); // Add this line to join the voice channel
            this.setupEventHandlers();
        });

        const token = configurationManager.getConfig('DISCORD_TOKEN');
        if (!token) {
            logger.error('DISCORD_TOKEN is not defined in the configuration. Exiting...');
            process.exit(1);
        } else {
            this.client.login(token).catch(error => {
                logger.error('Error logging into Discord:', error);
                process.exit(1);
            });
        }
    }

/**
 * Sets up the voice channel by joining it and configuring the connection to handle audio streams.
 * Ensures the bot has the necessary permissions and logs relevant information for debugging.
 */
async setupVoiceChannel() {
    const VOICE_CHANNEL_ID = constants.VOICE_CHANNEL_ID;
    logger.debug(`VOICE_CHANNEL_ID: ${VOICE_CHANNEL_ID}`);

    if (!VOICE_CHANNEL_ID) {
        logger.warn('VOICE_CHANNEL_ID is not set in the environment variables.');
        return;
    }

    try {
        // Fetch the voice channel using the provided ID
        const channel = await this.client.channels.fetch(VOICE_CHANNEL_ID);
        logger.debug(`Fetched channel: ${channel ? channel.id : 'null'}`);
        
        // Validate the fetched channel
        if (!channel || channel.type !== ChannelType.GuildVoice) {
            logger.error(`Channel with ID ${VOICE_CHANNEL_ID} is not a valid voice channel.`);
            return;
        }

        // Ensure the bot user is defined
        if (!this.client.user) {
            logger.error('Client user is not defined.');
            return;
        }

        // Fetch and validate the bot's permissions in the voice channel
        const permissions = channel.permissionsFor(this.client.user);
        logger.debug(`Permissions for channel: ${permissions ? permissions.bitfield : 'null'}`);
        if (!permissions) {
            logger.error(`Unable to fetch permissions for channel: ${channel.name}`);
            return;
        }

        if (!permissions.has(PermissionsBitField.Flags.Connect)) {
            logger.error(`Missing CONNECT permission for voice channel: ${channel.name}`);
            return;
        }

        if (!permissions.has(PermissionsBitField.Flags.Speak)) {
            logger.error(`Missing SPEAK permission for voice channel: ${channel.name}`);
            return;
        }

        if (!permissions.has(PermissionsBitField.Flags.UseVAD)) {
            logger.error(`Missing USE_VOICE_ACTIVITY permission for voice channel: ${channel.name}`);
            return;
        }

        // Attempt to join the voice channel
        logger.info(`Attempting to join voice channel: ${channel.name} (${channel.id})`);
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        logger.debug('Voice connection object:', connection);

        // Event listener for successful connection
        connection.on(VoiceConnectionStatus.Ready, async () => {
            logger.info(`Successfully connected to the voice channel: ${channel.name}`);
            await this.playWelcomeMessage(connection);
        });

        // Event listener for disconnection
        connection.on(VoiceConnectionStatus.Disconnected, (oldState, newState) => {
            if (newState.status === VoiceConnectionStatus.Disconnected) {
                logger.warn('Disconnected from the voice channel.');
            }
        });

        // Event listener for connection destruction
        connection.on(VoiceConnectionStatus.Destroyed, () => {
            logger.warn('Voice connection destroyed.');
        });

        // Event listener for connection errors
        connection.on('error', error => {
            logger.error(`Voice connection error: ${error.message}`);
        });

        // Event listener for when a user starts speaking
        connection.receiver.speaking.on('start', (userId) => {
            logger.info(`User ${userId} started speaking`);
            const audioStream = connection.receiver.subscribe(userId, { end: { behavior: EndBehaviorType.AfterSilence } });
            this.handleAudioStream(audioStream, userId, connection);
        });

        // Event listener for when a user stops speaking
        connection.receiver.speaking.on('end', (userId) => {
            logger.info(`User ${userId} stopped speaking`);
        });
    } catch (error) {
        logger.error(`Error setting up voice channel: ${error.message}`);
    }
}

    async playWelcomeMessage(connection) {
        const welcomeMessage = constants.WELCOME_MESSAGE;
        logger.info(`Playing welcome message: "${welcomeMessage}"`);
        logger.debug('Dependency Report:\n' + generateDependencyReport());
    
        const openai = new OpenAI({
            apiKey: constants.NARRATION_API_KEY
        });
    
        try {
            // Generate speech using OpenAI's text-to-speech API
            const response = await openai.audio.speech.create({
                model: "tts-1",
                voice: "nova",
                input: welcomeMessage,
            });
    
            // Get the audio data as a buffer
            const buffer = Buffer.from(await response.arrayBuffer());
    
            // Write the buffer to a file
            const writeFile = util.promisify(fs.writeFile);
            await writeFile('welcome.mp3', buffer);
    
            // Play the audio file
            const player = createAudioPlayer();
            const resource = createAudioResource('welcome.mp3');
            player.play(resource);
            connection.subscribe(player);
    
            player.on(AudioPlayerStatus.Idle, () => {
                fs.unlinkSync('welcome.mp3');
            });
    
            player.on('error', error => {
                logger.error(`Error playing welcome message: ${error.message}`);
            });
    
        } catch (error) {
            logger.error(`Error generating welcome message: ${error.message}`);
            if (error.response) {
                logger.error(`Response status: ${error.response.status}`);
                logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
            }
        }

    }    

/**
 * Transcribes audio using the OpenAI API.
 * @param {string} audioFilePath - The path to the audio file to be transcribed.
 * @returns {Promise<string>} The transcribed text.
 */
async transcribeAudio(audioFilePath) {
    try {
    
        const openai = new OpenAI({
            apiKey: constants.TRANSCRIBE_API_KEY
        });

        const response = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioFilePath),
            model: 'whisper-1', // Assuming you are using OpenAI Whisper model
            response_format: 'text', // Specify the desired response format
            headers: {
                'Content-Type': 'audio/wav' // Ensure the correct content type is specified
            }
        });

        logger.debug('transcribeAudio: Response data:', response.data);
        return response.data.text;
    } catch (error) {
        logger.error(`transcribeAudio: Error transcribing audio: ${error.message}`);
        if (error.response) {
            logger.debug(`transcribeAudio: Response status: ${error.response.status}`);
            logger.debug(`transcribeAudio: Response data: ${JSON.stringify(error.response.data)}`);
        }
        throw error;
    }
}

async handleAudioStream(stream, userId, connection) {
    const audioChunks = [];
    logger.debug(`handleAudioStream: Initialized for user ${userId}`);

    stream.on('data', (chunk) => {
        logger.info(`Receiving audio data from user ${userId}`);
        audioChunks.push(chunk);
        logger.debug(`handleAudioStream: Collected audio chunk of size ${chunk.length}`);
    });

    stream.on('end', async () => {
        logger.debug(`handleAudioStream: End of audio stream for user ${userId}`);
        
        try {
            const audioBuffer = Buffer.concat(audioChunks);
            logger.debug(`handleAudioStream: Concatenated audio buffer size ${audioBuffer.length}`);
            
            if (audioBuffer.length === 0) {
                logger.warn(`handleAudioStream: Audio buffer is empty, skipping transcription`);
                return;
            }
            
            const wavBuffer = await convertOpusToWav(audioBuffer);
            const audioFilePath = 'audio.wav';
            fs.writeFileSync(audioFilePath, wavBuffer);

            // Log file details for debugging
            const stats = fs.statSync(audioFilePath);
            logger.debug(`handleAudioStream: Saved WAV file size ${stats.size}`);

            if (stats.size === 0) {
                logger.warn(`handleAudioStream: WAV file size is 0, skipping transcription`);
                return;
            }
            
            const transcript = await this.transcribeAudio(audioFilePath);
            if (transcript) {
                logger.info(`Transcription: ${transcript}`);
                logger.debug(`handleAudioStream: Transcription successful`);

                const response = await this.generateResponse(transcript);
                logger.debug(`handleAudioStream: Generated response: ${response}`);

                await this.playAudioResponse(connection, response);
                logger.debug(`handleAudioStream: Played audio response`);
            } else {
                logger.warn(`handleAudioStream: Transcription returned null or undefined`);
            }
        } catch (error) {
            logger.error(`handleAudioStream: Error processing audio stream for user ${userId}: ${error.message}`);
            logger.debug(`handleAudioStream: Error stack trace: ${error.stack}`);
        }
    });

    stream.on('error', (error) => {
        logger.error(`handleAudioStream: Error in audio stream for user ${userId}: ${error.message}`);
        logger.debug(`handleAudioStream: Stream error stack trace: ${error.stack}`);
    });
}

    /**
     * Generates a response using the LLM API.
     */
    async generateResponse(transcript) {
        const llmEndpointUrl = constants.LLM_ENDPOINT_URL;
        if (!llmEndpointUrl) {
            logger.error('LLM_ENDPOINT_URL is not set in the environment variables.');
            return;
        }

        logger.debug(`LLM_ENDPOINT_URL: ${llmEndpointUrl}`);

        const response = await axios.post(llmEndpointUrl, {
            prompt: transcript,
            max_tokens: 20,
        }, {
            headers: {
                'Authorization': `Bearer ${constants.LLM_API_KEY}`
            }
        });

        return response.data.choices[0].text.trim();
    }

    /**
     * Plays the audio response back in the voice channel.
     */
    async playAudioResponse(connection, text) {
        const narrationEndpointUrl = constants.NARRATION_ENDPOINT_URL;
        if (!narrationEndpointUrl) {
            logger.error('NARRATION_ENDPOINT_URL is not set in the environment variables.');
            return;
        }

        logger.debug(`NARRATION_ENDPOINT_URL: ${narrationEndpointUrl}`);

        const response = await axios.post(narrationEndpointUrl, {
            input: text,
            voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
            audioConfig: { audioEncoding: 'MP3' }
        }, {
            headers: {
                'Authorization': `Bearer ${constants.NARRATION_API_KEY}`
            }
        });

        const audioBuffer = Buffer.from(response.data.audioContent, 'base64');

        const writeFile = util.promisify(fs.writeFile);
        await writeFile('output.mp3', audioBuffer);

        const player = createAudioPlayer();
        const resource = createAudioResource('output.mp3');
        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Idle, () => {
            fs.unlinkSync('output.mp3');
        });

        player.on('error', error => {
            logger.error(`Error playing audio response: ${error.message}`);
        });
    }

    /**
     * Configures event listeners for typing events and message creation, handling them appropriately.
     */
    setupEventHandlers() {
        this.client.on('typingStart', (channel) => {
            this.typingTimestamps.set(channel.id, Date.now());
        });

        this.client.on('messageCreate', async (discordMessage) => {
            try {
                // Debug: Log the entire message object to check all properties
                logger.debug(`[DiscordManager] Received message object: ${JSON.stringify(discordMessage)}`);

                // Ensure this.client is set
                if (!this.client) {
                    logger.error(`[DiscordManager] Discord client is not initialized.`);
                    return;
                }

                const processedMessage = new DiscordMessage(discordMessage);

                if (!processedMessage.getMessageId() || !processedMessage.getText()) {
                    logger.error(`[DiscordManager] Invalid or incomplete message received: ID: ${processedMessage.getMessageId()}, Content: ${processedMessage.getText()}`);
                    return; // Exit if message is incomplete to prevent errors downstream
                }

                // Prevent the bot from responding to its own messages
                if (processedMessage.getAuthorId() === constants.CLIENT_ID) {
                    logger.debug(`[DiscordManager] Skipping response to own message ID: ${processedMessage.getMessageId()}`);
                    return;
                }

                logger.debug(`[DiscordManager] Processed message ID: ${processedMessage.getMessageId()}`);

                // Validate getChannelId
                const channelId = processedMessage.getChannelId();
                if (!channelId) {
                    logger.error(`[DiscordManager] Processed message has no valid channel ID.`);
                    return;
                }

                // Directly utilize fetchChannel and fetchMessages from discordUtils to get channel context
                const channel = await discordUtils.fetchChannel(this.client, channelId);
                if (!channel) {
                    logger.error(`[DiscordManager] Could not fetch channel with ID: ${channelId}`);
                    return;
                }

                logger.debug(`[DiscordManager] Fetched channel: ${channel.id}`);
                const historyMessages = await this.fetchMessages(channelId);

                if (historyMessages) {
                    logger.info(`Channel topic: ${channel.topic || "No topic"}. History messages count: ${historyMessages.length}`);
                }

                if (this.messageHandler) {
                    logger.debug(`Executing message handler on channel ${channel.id}`);
                    // logger.debug(`Handler Args - Processed Message: ${JSON.stringify(processedMessage)}, History Messages: ${JSON.stringify(historyMessages)}, Channel: ${JSON.stringify(channel)}`);
                    // await this.messageHandler(processedMessage, historyMessages, channel);
                    await this.messageHandler(processedMessage, historyMessages);
                }
            } catch (error) {
                logger.error(`[DiscordManager] Error processing message: ${error.message}`, { error });
            }
        });
    }

    /**
     * Sets a callback function to handle incoming Discord messages.
     * @param {Function} messageHandlerCallback - The function to be called with the message data.
     */
    setMessageHandler(messageHandlerCallback) {
        if (typeof messageHandlerCallback !== 'function') {
            throw new Error("messageHandlerCallback must be a function");
        }
        this.messageHandler = messageHandlerCallback;
    }

    /**
     * Fetches a specified number of messages from a given channel using utility functions from discordUtils.
     * @param {string} channelId - The ID of the channel to fetch messages from.
     * @returns {Promise<Array<DiscordMessage>>} A promise that resolves to an array of DiscordMessage instances.
     */
    async fetchMessages(channelId) {
        const messages = await discordUtils.fetchMessages(this.client, channelId);
        return messages.reverse(); // So the last message is at the bottom
    }

    /**
     * Sends a response message to a specified channel, splitting it if it exceeds Discord's character limit.
     * @param {string} channelId - The ID of the channel to send the message to.
     * @param {string} messageText - The text of the message to be sent.
     * @returns {Promise<void>}
     */
    async sendResponse(channelId, messageText) {
        this.logMessageTimestamp(channelId);
        await discordUtils.sendResponse(this.client, channelId, messageText);
    }

    async sendMessage(channelId, messageText) {
        this.sendResponse(channelId, messageText);
    }

    /**
     * Retrieves the singleton instance of DiscordManager, creating it if it does not already exist.
     * @returns {DiscordManager} The singleton instance.
     */
    static getInstance() {
        if (!DiscordManager.instance) {
            DiscordManager.instance = new DiscordManager();
        }
        return DiscordManager.instance;
    }

    /**
     * Retrieves the last typing timestamp for a specified channel.
     * @param {string} channelId - The ID of the channel to query.
     * @returns {number} The timestamp of the last typing event, or the current time if none is recorded.
     */
    getLastTypingTimestamp(channelId) {
        return this.typingTimestamps.get(channelId) || Date.now();
    }

    getLastMessageTimestamp(channelId) {
        return this.messageTimestamps.get(channelId) || 0; // Retrieve the last message timestamp, or 0 if none exists
    }

    /**
     * Records the timestamp of a sent message.
     * @param {string} channelId - The ID of the channel where the message was sent.
     */
    logMessageTimestamp(channelId) {
        this.messageTimestamps.set(channelId, Date.now());
    }

    /**
     * Signals that the bot is typing in a specific channel. This visual cue can make interactions
     * feel more dynamic and responsive.
     *
     * @param {string} channelId - The ID of the channel where the bot appears to start typing.
     */
    async startTyping(channelId) {
        try {
            logger.debug(`[DiscordManager] Fetching channel ID: ${channelId}`);
            const channel = await this.client.channels.fetch(channelId);
            logger.debug(`[DiscordManager] Fetched channel: ${channel ? channel.id : 'null'}`);

            if (!channel) {
                logger.error(`[DiscordManager] Channel with ID: ${channelId} not found.`);
                return;
            }

            logger.debug(`[DiscordManager] Channel type: ${channel.type}`);
            if (channel.type === 'GUILD_TEXT' || channel.type === 'DM') {
                // Check if the bot has permission to send messages in the channel
                const permissions = channel.permissionsFor(this.client.user);
                if (!permissions || !permissions.has(PermissionsBitField.Flags.SendMessages)) {
                    logger.error(`[DiscordManager] Missing SEND_MESSAGES permission in channel ID: ${channelId}`);
                    return;
                }

                await channel.sendTyping();
                logger.debug(`[DiscordManager] Started typing in channel ID: ${channelId}`);
            } else {
                logger.debug(`[DiscordManager] Channel ID: ${channelId} does not support typing.`);
            }
        } catch (error) {
            logger.error(`[DiscordManager] Failed to start typing in channel ID: ${channelId}: ${error}`);
        }
    }

}

module.exports = DiscordManager;
