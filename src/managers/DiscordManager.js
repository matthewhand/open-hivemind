// src/managers/DiscordManager.js
const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('../utils/logger');
const configurationManager = require('../config/configurationManager');
const discordUtils = require('../utils/discordUtils');
const messageHandler = require('../handlers/messageHandler').messageHandler; // Ensure this is correctly imported

class DiscordManager {
    static instance;
    client;
    messageHandler;

    constructor(messageHandlerCallback) {
        if (DiscordManager.instance) {
            logger.debug('Returning existing instance of DiscordManager.');
            return DiscordManager.instance;
        }
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });
        this.messageHandler = messageHandlerCallback; // Assigning the passed message handler to the manager
        this.initialize();
        DiscordManager.instance = this;
    }

    initialize() {
        this.client.once('ready', async () => {
            logger.info(`Bot logged in as ${this.client.user.tag} with ID: ${this.client.user.id}`);
            this.setupEventHandlers();
        });

        const token = configurationManager.getConfig('DISCORD_TOKEN');
        if (!token) {
            logger.error('DISCORD_TOKEN is not defined in the configuration. Exiting...');
            process.exit(1);
        } else {
            this.client.login(token).catch(error => logger.error('Error logging into Discord:', error));
        }
    }

    setupEventHandlers() {
        this.client.on('messageCreate', async (message) => {
            try {
                // Convert the Discord message to a generic message format before processing
                const processedMessage = await discordUtils.processDiscordMessage(message);
                // Pass the processed message to the assigned message handler
                if (this.messageHandler) {
                    await this.messageHandler(processedMessage);
                } else {
                    logger.warn('No message handler function has been assigned to DiscordManager.');
                }
            } catch (error) {
                logger.error('Error handling messageCreate event:', error);
            }
        });
    }

    // Using discordUtils for fetchMessages and sendResponse
    async fetchMessages(channelId, limit = 20) {
        return await discordUtils.fetchMessages(this.client, channelId, limit);
    }

    async sendResponse(channelId, messageText) {
        await discordUtils.sendResponse(this.client, channelId, messageText);
    }

    // Using discordUtils for getBotId
    async getBotId() {
        return await discordUtils.getBotId(this.client);
    }

    static getInstance(messageHandlerCallback) {
        if (!DiscordManager.instance) {
            new DiscordManager(messageHandlerCallback);
        }
        return DiscordManager.instance;
    }
}

module.exports = DiscordManager;
