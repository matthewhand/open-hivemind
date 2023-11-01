const { Client, GatewayIntentBits } = require('discord.js');
const { registerCommands, handleCommands } = require('./commands');
const logger = require('./logger');
const { DecideToRespond } = require('./responseDecider');
const { executePythonCode, extractPythonCodeBlocks, isUserAllowed, isRoleAllowed } = require('./utils');
const { handleImageMessage } = require('./handleImageMessage');
const { sendLlmRequest } = require('./sendLlmRequest');
const { handleError } = require('./handleError');
const { debugEnvVars } = require('./debugEnvVars');
const { initializeFetch } = require('./initializeFetch');
const { startWebhookServer } = require('./webhook');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const token = process.env.DISCORD_TOKEN;

registerCommands(clientId, token, guildId);
handleCommands(client);
client.login(token);

logger.info('Bot started successfully.');

async function initialize() {
  initializeFetch();
  const webhookPort = process.env.WEBHOOK_PORT || 3000;
  startWebhookServer(webhookPort);
client.on('messageCreate', async (message) => {
  try {
    if (message.author.id === client.user.id || message.author.bot) {
      return;
    }

    const userId = message.author.id;
    const member = await message.guild.members.fetch(userId);
    const userRoles = member.roles.cache.map(role => role.id);

    if (!isUserAllowed(userId) && !isRoleAllowed(userRoles)) {
      return;
    }

    const { shouldReply, isDirectMention } = responseDecider.shouldReplyToMessage(client.user.id, message);
    const wakeWordDetected = llmWakeWords.some(wakeWord => 
      message.content.toLowerCase().includes(wakeWord.toLowerCase())
    );

    if (message.content.startsWith('!analyse')) {
      await handleImageMessage(message);
      return;  // Exit if this condition is met to avoid further processing
    }

    if (message.content.startsWith('!execute')) {
      const codeBlocks = extractPythonCodeBlocks(message.content);
      if (codeBlocks) {
        codeBlocks.forEach((codeBlock) => {
          const code = codeBlock.replace(/\`\`\`\s*python\s*|\`\`\`/gi, '');
          executePythonCode(code, message);
        });
      }
      return;  // Exit if this condition is met to avoid further processing
    }

    if (wakeWordDetected || shouldReply || isDirectMention) {
      await sendLlmRequest(message);
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
