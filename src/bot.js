const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('./utils/logger');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.login(process.env.DISCORD_TOKEN).then(() => {
    logger.info('Bot logged in successfully.');
}).catch(error => {
    logger.error(`Bot login failed: ${error}`);
    process.exit(1); // Exit the process in case of login failure
});

client.once('ready', () => {
    logger.info('Bot is ready and connected.');
    // You can perform additional setup here if needed
});

client.on('error', error => {
    logger.error(`Discord Client Error: ${error}`);
});

module.exports = client;
