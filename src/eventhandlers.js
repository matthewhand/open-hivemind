module.exports = (client) => {
    const logger = require('./utils/logger');
    const { messageHandler } = require('./handlers/messageHandler');

    // Event Handler for new messages
    client.on('messageCreate', async message => {
        try {
            logger.debug(`New message received: ${message.content}`);
            if (message.author.bot) return; // Ignore messages from bots

            // Implement your logic to handle messages
            await messageHandler(message);
        } catch (error) {
            logger.error(`Error in messageCreate handler: ${error}`);
        }
    });


};
