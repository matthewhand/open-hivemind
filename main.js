
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const token = process.env.DISCORD_TOKEN;
client.login(token);
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});
