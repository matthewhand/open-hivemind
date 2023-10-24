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
const llmUrl = process.env.LLM_URL;
const llmWakeWords = process.env.LLM_WAKEWORDS ? process.env.LLM_WAKEWORDS.split(',') : [triggerWord];

let fetch;
(async () => {
  fetch = (await import('node-fetch')).default;
})();

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






const { Client, GatewayIntentBits } = require('discord.js');
const { exec } = require('child_process');
const { registerCommands, handleCommands } = require('./commands');
const { startWebhookServer } = require('./webhook');
const logger = require('./logger');
const fs = require('fs');
const { DecideToRespond } = require('./responseDecider');

const discordSettings = {
    disableUnsolicitedReplies: false,
    unsolicitedChannelCap: 5,
    ignore_dms: true,
    // ... other settings ...
};
const interrobangBonus = 0.1;
const timeVsResponseChance = [[300, 0.05], [600, 0.1], [1200, 0.2]];

const responseDecider = new DecideToRespond(discordSettings, interrobangBonus, timeVsResponseChance);

const clientId = process.env.CLIENT_ID;
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const allowedUsers = process.env.ALLOWED_USERS.split(',');
const triggerWord = process.env.TRIGGER_WORD || 'pybot';
const llmUrl = process.env.LLM_URL;
const llmWakeWords = process.env.LLM_WAKEWORDS ? process.env.LLM_WAKEWORDS.split(',') : [triggerWord];

let fetch;
(async () => {
  fetch = (await import('node-fetch')).default;
})();

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

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

registerCommands(clientId, token, guildId);
handleCommands(client);
client.login(token);

logger.info('Bot started successfully.');
logger.info(`Allowed users: ${allowedUsers}`);

client.on('messageCreate', async (message) => {
  try {
    if (message.author.id === client.user.id) {
      return;
    }

    logger.info(`Received message: ${message.content} from ${message.author.username}`);

    if (message.guild) {
      const userId = message.author.id;
      const { shouldReply, isDirectMention } = responseDecider.shouldReplyToMessage(client.user.id, message);

      const wakeWordDetected = llmWakeWords.some(wakeWord => 
        message.content.toLowerCase().includes(wakeWord.toLowerCase())
      );

      if (wakeWordDetected || shouldReply || isDirectMention) {
        logger.info(`wakeWordDetected/shouldReply/isDirectMention in message: ${message.content}`);
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

const handleError = (error, message) => {
  logger.error(`An error occurred: ${error.message}`);
  message.channel.send('An error occurred while processing your request.');
};

const port = process.env.PORT || 3000;
startWebhookServer(port);

