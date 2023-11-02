const { Client, GatewayIntentBits } = require('discord.js');
const { registerCommands, handleCommands } = require('./commands');
const logger = require('./utils/logger');
const { DecideToRespond } = require('./utils/responseDecider');
//const Replicate = require('replicate');
const { executePythonCode, extractPythonCodeBlocks, isUserAllowed, isRoleAllowed } = require('./utils/utils');
const { handleImageMessage } = require('./utils/handleImageMessage');
const { sendLlmRequest } = require('./utils/sendLlmRequest');
const { handleError } = require('./utils/handleError');
const { debugEnvVars } = require('./utils/debugEnvVars');
const { initializeFetch } = require('./utils/initializeFetch');
const { startWebhookServer } = require('./webhook');

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
      return;
    }

    if (message.content.startsWith('!execute')) {
      const codeBlocks = extractPythonCodeBlocks(message.content);
      if (codeBlocks) {
        codeBlocks.forEach((codeBlock) => {
          const code = codeBlock.replace(/\`\`\`\s*python\s*|\`\`\`/gi, '');
          executePythonCode(code, message);
        });
      }
      return;
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
