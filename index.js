const { Client, GatewayIntentBits } = require('discord.js');
const { registerCommands, handleCommands, commandExecutors } = require('./commands');
const { startWebhookServer } = require('./webhook');

const clientId = process.env.CLIENT_ID;
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

// Register Discord commands
registerCommands(clientId, token, guildId);

// Handle Discord commands
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
handleCommands(client);
client.login(token);

// Start webhook server
const port = process.env.PORT || 3000;
startWebhookServer(port);
