// Importing required modules
import { Client, GatewayIntentBits } from 'discord.js';
import { exec } from 'child_process';
import { registerCommands, handleCommands } from './commands';
import { startWebhookServer } from './webhook';
import logger from './logger';
import fs from 'fs';

// Configuring environment variables
const {
  CLIENT_ID: clientId,
  DISCORD_TOKEN: token,
  GUILD_ID: guildId,
  ALLOWED_USERS: allowedUsersString,
  TRIGGER_WORD: triggerWord = 'pybot',
  LLM_URL: llmUrl,
  LLM_WAKEWORDS: llmWakeWordsString,
} = process.env;

const allowedUsers = allowedUsersString.split(',');
const llmWakeWords = llmWakeWordsString ? llmWakeWordsString.split(',') : [triggerWord];

// Defining helper functions
const isUserAllowed = userId => allowedUsers.includes(userId);
const extractPythonCodeBlocks = content => content.match(/\`\`\`python\n?([\s\S]+?)\`\`\`/g);
const executePythonCode = async (code, message) => {
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



// Initializing Discord client and registering commands
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
registerCommands(clientId, token, guildId);
handleCommands(client);
client.login(token);

// Logging successful start
logger.info('Bot started successfully.');
logger.info(`Allowed users: ${allowedUsers}`);

// Handling message creation events
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

// Handling errors
const handleError = (error, message) => {
  logger.error('An error occurred:', error);
  message.channel.send('An error occurred while processing your request.');
};

// Starting webhook server
const port = process.env.PORT || 3000;
startWebhookServer(port);

// Importing node-fetch dynamically
let fetch;
(async () => {
  fetch = (await import('node-fetch')).default;
})();
