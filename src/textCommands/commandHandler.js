const { handleImageAnalysis } = require('./handleImageAnalysis');
const { handlePerplexityRequest } = require('./handlePerplexityRequest');
const { handleQuivrRequest } = require('./handleQuivrRequest');
const { handleFlowiseRequest } = require('./handleFlowiseRequest');
const { handlePythonRequest } = require('./handlePythonRequest');

const commandHandlers = {
    'analyse': handleImageAnalysis,
    'analyze': handleImageAnalysis,
    'llava': handleImageAnalysis,
    'perplexity': handlePerplexityRequest,
    'quivr': handleQuivrRequest,
    'flowise': handleFlowiseRequest,
    'python': handlePythonRequest,
    'execute': handlePythonRequest
};

const registerCommands = async (clientId, token, guildId) => {
    const rest = new REST({ version: '9' }).setToken(token);
    try {
        logger.info(`Started refreshing ${commands.length} application (/) commands.`);

        // Log the commands being registered for debugging
        logger.debug("Registering the following commands:", commands);

        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );
        logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        logger.error('Error registering commands:', error.message);
        if (error.code === 50001) {
            logger.error('Missing Access: The bot does not have permissions to register slash commands in the guild.');
        } else if (error.code === 50013) {
            logger.error('Missing Permissions: The bot lacks necessary permissions to execute this operation.');
        }

        // Log the error details for more information
        logger.debug('Error details:', error);
    }
};

module.exports = { commandHandler };
