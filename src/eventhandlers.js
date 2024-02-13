const logger = require('./utils/logger');
const { commandHandler } = require('./handlers/commandHandler');
const { messageHandler } = require('./handlers/messageHandler');
const client = require('./managers/discordBotManager');

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

// Event Handler for new interactions (like slash commands)
client.on('interactionCreate', async interaction => {
    try {
        logger.debug(`New interaction received: ${interaction.id}`);
        if (!interaction.isCommand()) return; // Ignore non-command interactions

        // Implement your logic to handle interactions
        await commandHandler(interaction);
    } catch (error) {
        logger.error(`Error in interactionCreate handler: ${error}`);
    }
});

// You can add more event handlers as needed
