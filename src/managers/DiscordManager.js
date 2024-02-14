const { Client, GatewayIntentBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const configurationManager = require('../config/configurationManager');

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
        this.initialize();
        DiscordManager.instance = this;
    }

    initialize() {
        this.client.once('ready', async () => {
            logger.info(`Logged in as ${this.client.user.tag}!`);
            this.botId = this.client.user.id;

            // Register Slash Commands after the bot is ready
            await this.registerSlashCommands();
        });

        const token = configurationManager.getConfig('DISCORD_TOKEN');
        if (!token) {
            logger.error('DISCORD_TOKEN is not defined in the configuration.');
            process.exit(1);
        }
        this.client.login(token).catch(error => logger.error('Error logging into Discord:', error));
    }

    async getBotId(retryCount = 3, retryDelay = 2000) {
        // Implementation remains the same as provided
    }

    // Methods for fetchLastNonBotMessage, fetchMessages, and sendResponse remain unchanged

    async registerSlashCommands() {
        const commands = [];
        const commandsPath = path.join(__dirname, '..', 'commands', 'slash');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(path.join(commandsPath, file));
            commands.push(command.data.toJSON());
        }

        const rest = new REST({ version: '9' }).setToken(configurationManager.getConfig('DISCORD_TOKEN'));
        try {
            await rest.put(
                Routes.applicationGuildCommands(configurationManager.getConfig('CLIENT_ID'), configurationManager.getConfig('GUILD_ID')),
                { body: commands },
            );
            logger.info(`Successfully registered ${commands.length} slash commands.`);
        } catch (error) {
            logger.error('Failed to register slash commands:', error);
        }
    }

    static getInstance() {
        if (!DiscordManager.instance) {
            new DiscordManager();
        }
        return DiscordManager.instance;
    }

    async getBotId(retryCount = 3, retryDelay = 2000) {
        for (let attempt = 0; attempt < retryCount; attempt++) {
            if (this.botId) return this.botId; // Return immediately if botId is already available

            if (this.client.user) {
                this.botId = this.client.user.id;
                return this.botId;
            }

            // Wait for the 'ready' event or retryDelay, whichever comes first
            await new Promise(resolve => {
                const readyHandler = () => {
                    this.client.off('ready', readyHandler); // Clean up the event listener
                    resolve();
                };
                this.client.once('ready', readyHandler);
                setTimeout(resolve, retryDelay); // Resolve after retryDelay regardless of 'ready' event
            });
        }

        if (!this.botId) {
            logger.warn(`Bot ID could not be retrieved after ${retryCount} attempts.`);
        }
        return this.botId || null;
    }


}

module.exports = DiscordManager;
