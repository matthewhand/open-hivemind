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
const timeVsResponseChance = [[5, 0.05], [60, 0.5], [420, 0.3]];

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

        const modelToUse = requestBody.model || process.env.LLM_SYSTEM || 'mistral-7b-instruct';

        // Prepare the request body
        const requestBody = {
          model: modelToUse,
          messages: [
            { role: 'system', content: process.env.LLM_SYSTEM || 'You are a helpful assistant.' },
            { role: 'user', content: userMessage }
          ]
        };
        
    // Prepare headers
    const headers = {
        'Content-Type': 'application/json',
    };
    if (process.env.LLM_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.LLM_API_KEY}`;
    }

        // Log the request payload if DEBUG is set to true
        if (process.env.DEBUG === 'true') {
            console.log('Request payload:', JSON.stringify(requestBody, null, 2));
        }

        // Send a POST request with a JSON body
        const response = await fetch(llmUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            console.error('Request failed:', response.statusText);
            // Log the response body if DEBUG is set to true
            if (process.env.DEBUG === 'true') {
                const responseBody = await response.text();
                console.error('Response body:', responseBody);
            }
            // message.reply('Server error.');
            return;
        }
        const responseData = await response.json();

        if (responseData && responseData.choices && responseData.choices[0] && responseData.choices[0].message && responseData.choices[0].message.content) {
          message.reply(responseData.choices[0].message.content);
        } else {
          message.reply('No response from the server.');
        }
      } else {
        const codeBlocks = extractPythonCodeBlocks(message.content);
        if (!codeBlocks) {
          logger.info('No Python code blocks found');
          return;
        }
          
        if (!isUserAllowed(userId)) {
          message.reply('You do not have permission to execute this command.');
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

function debugEnvVars() {
  // List of required environment variables
  const requiredEnvVars = [
    'CLIENT_ID',
    'DISCORD_TOKEN',
    'GUILD_ID',
    'ALLOWED_USERS',
    'LLM_URL',
    'LLM_SYSTEM',
    'LLM_API_KEY',
    'PORT'
  ];

  // Check if DEBUG environment variable is set to true
  if (process.env.DEBUG && process.env.DEBUG.toLowerCase() === 'true') {
    // Log all environment variables
    console.log('Debugging Environment Variables:');
    requiredEnvVars.forEach(varName => {
      console.log(`${varName}: ${process.env[varName] || 'Not Set'}`);
    });
  }

  // Check if all required environment variables are set
  const unsetVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (unsetVars.length > 0) {
    console.error(`The following environment variables are not set: ${unsetVars.join(', ')}`);
    process.exit(1);  // Exit the process with an error code
  }
}

// Call the debug function at the start of your application
debugEnvVars();

const port = process.env.PORT || 3000;
startWebhookServer(port);

