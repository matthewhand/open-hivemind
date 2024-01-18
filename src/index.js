const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('./utils/logger');
const { registerCommands } = require('./utils/registerSlashCommands');
const { commandHandler } = require('./textCommands/commandHandler');
const { handleError } = require('./utils/handleError');
const { debugEnvVars } = require('./utils/debugEnvVars');
const { initializeFetch } = require('./utils/initializeFetch');
const { startWebhookServer } = require('./webhook');
const { isUserAllowed } = require('./utils/permissions');
const { DecideToRespond } = require('./utils/responseDecider');
const { sendLlmRequest } = require('./utils/sendLlmRequest');

const discordSettings = {
    disableUnsolicitedReplies: false,
    unsolicitedChannelCap: 5,
    ignore_dms: true,
};
const interrobangBonus = 0.1;
const timeVsResponseChance = [[5, 0.05], [60, 0.5], [420, 0.3]];

const responseDecider = new DecideToRespond(discordSettings, interrobangBonus, timeVsResponseChance);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.login(process.env.DISCORD_TOKEN);
logger.info('Bot started successfully.');

client.once('ready', () => {
    logger.info('Bot is ready!');
    registerCommands(client);
});

async function initialize() {
    initializeFetch();
    const webhookPort = process.env.WEB_SERVER_PORT || 3000;
    startWebhookServer(webhookPort);

    client.on('messageCreate', async (message) => {
        try {
            if (message.author.bot || message.author.id === client.user.id) {
                return;
            }

            if (message.content.startsWith('!')) {
		await commandHandler(message);
                return;
            }

            // Handling non-command messages
            const { shouldReply, isDirectMention } = responseDecider.shouldReplyToMessage(client.user.id, message);
            if (shouldReply || isDirectMention) {
                await sendLlmRequest(message);
            }
        } catch (error) {
            handleError(error, message);
        }
    });
}

debugEnvVars();
initialize().catch(error => console.error('Error during initialization:', error));

