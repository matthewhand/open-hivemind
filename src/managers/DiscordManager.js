// src/managers/DiscordManager.js
const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('../utils/logger');
const configurationManager = require('../config/configurationManager');
const discordUtils = require('../utils/discordUtils');

class DiscordManager {
    static instance;
    client;

    constructor() {
        if (DiscordManager.instance) {
            return DiscordManager.instance;
        }
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });
        this.initialize();
        DiscordManager.instance = this;
    }

    initialize() {
        this.client.once('ready', () => {
            logger.info(`Bot logged in as ${this.client.user.tag} with ID: ${this.client.user.id}`);
        });

        const token = configurationManager.getConfig('DISCORD_TOKEN');
        if (!token) {
            logger.error('DISCORD_TOKEN is not defined in the configuration. Exiting...');
            process.exit(1);
        } else {
            this.client.login(token).catch(error => logger.error('Error logging into Discord:', error));
        }
    }

    setMessageHandler(messageHandlerCallback) {
        this.messageHandler = messageHandlerCallback;
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.on('messageCreate', async (discordMessage) => {
            try {
                // Assuming DiscordMessage class correctly wraps the discord.js message object
                const processedMessage = new DiscordMessage(discordMessage);
    
                // Now pass this processed message to the message handler
                if (this.messageHandler) {
                    await this.messageHandler(processedMessage);
                } else {
                    logger.warn('Message handler not set in DiscordManager.');
                }
            } catch (error) {
                logger.error(`Error processing message: ${error}`, { errorDetail: error });
            }
        });
    }
    
    // The fetchMessages, sendResponse, and getBotId methods remain as you've defined them.
    // Make sure these methods correctly use discordUtils as intended.

    static getInstance() {
        if (!DiscordManager.instance) {
            DiscordManager.instance = new DiscordManager();
        }
        return DiscordManager.instance;
    }
    async fetchMessages(channelId, limit = 20) {
        return discordUtils.fetchMessages(this.client, channelId, limit);
    }

    async sendResponse(channelId, messageText) {
        return discordUtils.sendResponse(this.client, channelId, messageText);
    }

    async getBotId() {
        return discordUtils.getBotId(this.client);
    }

}

module.exports = DiscordManager;
