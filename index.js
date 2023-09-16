const { Client, GatewayIntentBits } = require('discord.js');
const { exec } = require('child_process');
const { registerCommands, handleCommands } = require('./commands');
const { startWebhookServer } = require('./webhook');
const logger = require('./logger');
const fs = require('fs');

const clientId = process.env.CLIENT_ID;
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const allowedUsers = process.env.ALLOWED_USERS.split(',');
const triggerWord = process.env.TRIGGER_WORD || 'pybot';

// Register Discord commands
registerCommands(clientId, token, guildId);

// Handle Discord commands
const client = new Client({ intents: [
  GatewayIntentBits.Guilds, 
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent
] });
handleCommands(client);

// Start Discord client
client.login(token);
logger.info('Bot started successfully.');
logger.info(`Allowed users: ${allowedUsers}`);

// Handle Discord messages
client.on('messageCreate', async (message) => {
  try {
    // Prevent bot from responding to its own messages
    if (message.author.id === client.user.id) {
      return;
    }

    if (!message.content && message.interaction) {
      logger.debug('Received message (interaction):', message.interaction.content);
      logger.info('Message received (interaction):', message.interaction.content);
    } else {
      logger.debug('Received message:', message.content);
      logger.info('Message received:', message.content);
    }

    if (message.guild && message.content.toLowerCase().includes(triggerWord.toLowerCase())) {
      logger.info(`Message contains "${triggerWord}"`);

      const userId = message.author.id;
      const guild = message.guild;
      const member = message.member;

      if (!allowedUsers.includes(userId)) {
        logger.warn(`User, '${userId}' does not have permission`);
        return message.reply('You do not have permission to execute this command.');
      }

      const codeBlocks = message.content.match(/\`\`\`python\n?([\s\S]+?)\`\`\`/g);
      if (!codeBlocks) {
        logger.info('No Python code blocks found');
        return;
      }

      logger.info('Found Python code blocks:', codeBlocks);

      codeBlocks.forEach((codeBlock) => {
        const code = codeBlock.replace(/\`\`\`python\n?|\`\`\`/g, '');
        const escapedCode = code.replace(/"/g, '\\"');

        logger.info(`Executing Python code: ${escapedCode}`);

        exec(`python -c "${escapedCode}"`, (error, stdout, stderr) => {
          if (error) {
            message.reply(`Error executing code: ${error.message}`);
            return;
          }
          if (stderr) {
            message.reply(`Stderr: ${stderr}`);
            return;
          }
          message.reply(`Stdout: ${stdout}`);
        });
      });
    } else {
      // New code for handling other messages
      if (message.content.toLowerCase() === 'ping') {
        message.reply('Pong!');
      }
    }
  } catch (error) {
    logger.error('An error occurred:', error);
  }
});

// Start webhook server
const port = process.env.PORT || 3000;
startWebhookServer(port);
