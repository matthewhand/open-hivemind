require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { initializeFetch } = require('./initializeFetch');
const { handleImageMessage } = require('./handleImageMessage');
const { sendLlmRequest } = require('./sendLlmRequest');
const { isUserAllowed, isRoleAllowed } = require('./permissions');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });
const token = process.env.DISCORD_TOKEN;

// Environment variables
const allowedRoles = process.env.ALLOWED_ROLES ? process.env.ALLOWED_ROLES.split(',') : [];

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  initializeFetch();
});

client.on('messageCreate', async (message) => {
  try {
    if (message.author.id === client.user.id || message.author.bot) {
      return;
    }

    const member = await message.guild.members.fetch(message.author.id);
    const userRoles = member.roles.cache.map(role => role.id);
    
    if (!isUserAllowed(message.author.id) && !isRoleAllowed(userRoles, allowedRoles)) {
      return;
    }

    const command = message.content.split(' ')[0];
    const wakeWords = ['!command1', '!command2']; // replace with actual wake words

    if (wakeWords.includes(command.toLowerCase())) {
      sendLlmRequest(message);
      return;
    }

    if (command === '!analyse') {
      await handleImageMessage(message);
      return;
    }

    // More conditions and functionalities can go here.
    
  } catch (error) {
    console.error(`Error in message handler: ${error.message}`);
  }
});

client.login(token).catch(err => {
  console.error('Failed to login:', err.message);
});
