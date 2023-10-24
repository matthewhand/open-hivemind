const { Client, GatewayIntentBits } = require('discord.js');
const { exec } = require('child_process');
const { registerCommands, handleCommands } = require('./commands');
const { startWebhookServer } = require('./webhook');
const logger = require('./logger');
const fs = require('fs');
const fetch = require('node-fetch');

const clientId = process.env.CLIENT_ID;
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const allowedUsers = process.env.ALLOWED_USERS.split(',');
const triggerWord = process.env.TRIGGER_WORD || 'pybot';
const llmUrl = process.env.LLM_URL;
const llmWakeWords = process.env.LLM_WAKEWORDS ? process.env.LLM_WAKEWORDS.split(',') : [triggerWord];

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

// Helper function to check if a user is allowed
function isUserAllowed(userId) {
  return allowedUsers.includes(userId);
}

// Helper function to extract Python code blocks from a message
function extractPythonCodeBlocks(content) {
  return content.match(/\`\`\`python\n?([\s\S]+?)\`\`\`/g);
}

// Helper function to execute Python code
function executePythonCode(code, message) {
  const fileName = `tmp_${Date.now()}.py`;
  fs.writeFileSync(fileName, code);
  exec(`python ${fileName}`, (error, stdout, stderr) => {
    if (error) {
      message.reply(`Error executing code: ${error.message}`);
      return;
    }
    if (stderr) {
      message.reply(`Stderr: ${stderr}`);
      return;
    }
    message.reply(`Stdout: ${stdout}`);
    fs.unlinkSync(fileName);
  });
}




client.on('messageCreate', async (message) => {
  try {
    if (message.author.id === client.user.id) {
      return;
    }

    if (message.guild) {
      const userId = message.author.id;

      const wakeWordDetected = llmWakeWords.some(wakeWord => 
        message.content.toLowerCase().includes(wakeWord.toLowerCase())
      );

      if (wakeWordDetected) {
        const userMessage = message.content;
        const response = await fetch(`${llmUrl}?user=${encodeURIComponent(userMessage)}`);
        const responseData = await response.json();

        if (responseData && responseData[0] && responseData[0].response && responseData[0].response.response) {
          message.reply(responseData[0].response.response);
        } else {
          message.reply('No response from the server.');
        }
      } else {

       if (!isUserAllowed(userId)) {
        message.reply('You do not have permission to execute this command.');
        return;
      }

        const codeBlocks = extractPythonCodeBlocks(message.content);
        if (!codeBlocks) {
          logger.info('No Python code blocks found');
          return;
        }

        codeBlocks.forEach((codeBlock) => {
          const code = codeBlock.replace(/\`\`\`\s*python\s*|\`\`\`/gi, '');
          executePythonCode(code, message);
        });
        
      }

    } else {
      if (message.content.toLowerCase() === 'ping') {
        message.reply('Pong!');
      }
    }
  } catch (error) {
    handleError(error, message);
  }
});


// Helper function to handle errors
function handleError(error, message) {
  logger.error('An error occurred:', error);
  message.channel.send('An error occurred while processing your request.');
}

// Start webhook server
const port = process.env.PORT || 3000;
startWebhookServer(port);
