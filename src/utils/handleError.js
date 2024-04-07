const logger = require('./logger');

function handleError(error, message) {
    logger.error(`An error occurred: ${error.message}`);
    logger.error(`Error Stack Trace: ${error.stack}`);
    // message.channel.send('An error occurred while processing your request.');
}

module.exports = { handleError };
