// src/managers/DiscordManager.js
const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('../utils/logger');
const configurationManager = require('../config/configurationManager');
const discordUtils = require('../utils/discordUtils');
const DiscordMessage = require('../models/DiscordMessage');

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
            logger.info(`Bot connected as ${this.client.user.tag}`);
            this.setupEventHandlers();
        });

        const token = configurationManager.getConfig('DISCORD_TOKEN');
        if (!token) {
            logger.error('DISCORD_TOKEN is not defined in the configuration. Exiting...');
            process.exit(1);
        } else {
            this.client.login(token).then(() => {
                logger.info('Bot login attempt successful.');
            }).catch(error => {
                logger.error('Error logging into Discord:', error);
                process.exit(1);
            });
        }
    }

    setupEventHandlers() {
        this.client.on('messageCreate', async (discordMessage) => {
            try {
                const processedMessage = new DiscordMessage(discordMessage);
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

    async fetchMessages(channelId, limit = 20) {
        return discordUtils.fetchMessages(this.client, channelId, limit);
    }

    async sendResponse(channelId, messageText) {
        return discordUtils.sendResponse(this.client, channelId, messageText);
    }

    static getInstance() {
        if (!DiscordManager.instance) {
            DiscordManager.instance = new DiscordManager();
        }
        return DiscordManager.instance;
    }


    setBotId(botId) {
        this.botId = botId;
        logger.debug(`Bot ID set to: ${this.botId}`);
    }

    async getBotId() {
        return this.botId;
    }
}

module.exports = DiscordManager;
