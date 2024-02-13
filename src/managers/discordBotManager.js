// src/manager/discordBotManager.js
const { Client, GatewayIntentBits } = require('discord.js');

class DiscordBotManager {
    constructor(logger) {
        this.logger = logger;
        this.client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
        });

        // Bind class methods
        this.initBot = this.initBot.bind(this);
    }

    getClient() {
        return this.client;
    }

    initBot() {
        // Set up event listener for the 'ready' event before logging in
        this.client.once('ready', () => {
            this.logger.info('Bot is ready and connected.');
            // Additional setup can be performed here if needed
        });

        // Attempt to log in
        this.client.login(process.env.DISCORD_TOKEN).then(() => {
            this.logger.info('Bot logged in successfully.');
        }).catch(error => {
            this.logger.error(`Bot login failed: ${error}`);
            process.exit(1); // Exit the process in case of login failure
        });

        this.client.on('error', error => {
            this.logger.error(`Discord Client Error: ${error}`);
        });
    }
}

module.exports = DiscordBotManager;
