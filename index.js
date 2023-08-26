const { Client, GatewayIntentBits } = require('discord.js');
const { exec } = require('child_process');
const { registerCommands, handleCommands, commandExecutors } = require('./commands');
const { startWebhookServer } = require('./webhook');
const winston = require('winston');

const clientId = process.env.CLIENT_ID;
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const allowedUsers = process.env.ALLOWED_USERS.split(',');

const debugMode = process.env.DEBUG === 'true';
const logLevel = debugMode ? 'debug' : 'info';
const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

// Register Discord commands
registerCommands(clientId, token, guildId);

// Handle Discord commands
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent] });
handleCommands(client);

// Handle Discord messages
client.on('messageCreate', async (message) => {
  try {
    logger.debug('Received message:', message.content);
    logger.info('Message received:', message.content);

    if (message.guild && message.content.toLowerCase().includes('pybot')) {
      logger.info('Message contains "pybot"');

      const userId = message.author.id;
      const guild = message.guild;
      const member = message.member;

      if ((guild.ownerId !== member.id) && (!allowedUsers.includes(userId))) {
        logger.warn('User does not have permission');
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
      logger.info('Message does not contain "pybot"');
    }
  } catch (error) {
    logger.error('An error occurred:', error);
  }
});

client.login(token);
logger.info('Bot started successfully.');

// Start webhook server
const port = process.env.PORT || 3000;
startWebhookServer(port);
