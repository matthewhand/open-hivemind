const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('./utils/logger');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Set up event listener for the 'ready' event before logging in
client.once('ready', () => {
    logger.info('Bot is ready and connected.');
    // Additional setup can be performed here if needed
});

// Attempt to log in
client.login(process.env.DISCORD_TOKEN).then(() => {
    logger.info('Bot logged in successfully.');
}).catch(error => {
    logger.error(`Bot login failed: ${error}`);
    process.exit(1); // Exit the process in case of login failure
});

client.on('error', error => {
    logger.error(`Discord Client Error: ${error}`);
});

module.exports = client;
