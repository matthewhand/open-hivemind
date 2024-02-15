// src/managers/DiscordManager.js
const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('../utils/logger');
const configurationManager = require('../config/configurationManager');
const discordUtils = require('../utils/discordUtils');
const DiscordMessage = require('../models/DiscordMessage');
require('dotenv').config(); // Ensure environment variables are loaded

class DiscordManager {
    static instance;
    client;
    botId;

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
        this.botId = process.env.CLIENT_ID; // Set bot ID from environment variable
        logger.debug(`Bot ID set to: ${this.botId}`);
        this.initialize();
        DiscordManager.instance = this;
    }

    initialize() {
        this.client.once('ready', () => {
            logger.info(`Bot logged in as ${this.client.user.tag}`);
            // No need to set botId here since it's already set from CLIENT_ID
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
        this.client.on('messageCreate', async (discordMessage) => {
            try {
                const processedMessage = new DiscordMessage(discordMessage, this.botId);
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

    setMessageHandler(messageHandlerCallback) {
        if (typeof messageHandlerCallback !== 'function') {
            throw new Error("messageHandlerCallback must be a function");
        }
        this.messageHandler = messageHandlerCallback;
    }

    // The fetchMessages, sendResponse, and getBotId methods remain as previously defined,
    // ensuring they utilize discordUtils as intended and make use of the statically set botId.

    static getInstance() {
        if (!DiscordManager.instance) {
            DiscordManager.instance = new DiscordManager();
        }
        return DiscordManager.instance;
    }

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

    setBotId(botId) {
        this.botId = botId;
        logger.debug(`Bot ID set to: ${this.botId}`);
    }

}

module.exports = DiscordManager;
