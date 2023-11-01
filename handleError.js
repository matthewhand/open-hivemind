const logger = require('./logger');

function handleError(error, message) {
    logger.error(`An error occurred: ${error.message}`);
    message.channel.send('An error occurred while processing your request.');
}

export { handleError };
