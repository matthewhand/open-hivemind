const { Client, GatewayIntentBits } = require('discord.js');
const { registerCommands, handleCommands } = require('./commands');
const logger = require('./logger');
const { DecideToRespond } = require('./responseDecider');
const Replicate = require('replicate');
const { executePythonCode, extractPythonCodeBlocks, isUserAllowed } = require('./util');
const { handleImageMessage } = require('./handleImageMessage');
const { sendLlmRequest } = require('./sendLlmRequest');
const { handleError } = require('./handleError');
const { debugEnvVars } = require('./debugEnvVars');
const { initializeFetch } = require('./initializeFetch');

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
const triggerWord = process.env.TRIGGER_WORD || 'pybot';
const llmWakeWords = process.env.LLM_WAKEWORDS ? process.env.LLM_WAKEWORDS.split(',') : [triggerWord];

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

registerCommands(clientId, token, guildId);
handleCommands(client);
client.login(token);

logger.info('Bot started successfully.');

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function initialize() {
  initializeFetch();

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

          const imageDetected = await handleImageMessage(message, replicate);
          if (!imageDetected) {
            await sendLlmRequest(message);
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
}

debugEnvVars();

initialize().catch(error => {
  console.error('Error during initialization:', error);
});
