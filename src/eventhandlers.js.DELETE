module.exports = (client) => {
    const logger = require('./utils/logger');
    const { messageHandler } = require('./handlers/messageHandler');

    // Event Handler for new messages
    client.on('messageCreate', async message => {
        try {
            logger.debug(`New message received: ${message.content}`);
            if (message.author.bot) return; // Ignore messages from bots
    
            const discordManager = DiscordManager.getInstance();
            const botId = discordManager.getBotId();
            if (!botId) {
                logger.error('Bot ID is undefined. Cannot proceed.');
                return;
            }
    
            // Continue with message handling...
        } catch (error) {
            logger.error(`Error in messageCreate handler: ${error}`);
        }
    });
    
};
