const logger = require('../utils/logger');
const Command = require('../utils/Command');

// Manually require each command (instances)
const banCommand = require('./ban');
const flowiseCommand = require('./flowise');
const helpCommand = require('./help');
const httpCommand = require('./http');
const imageCommand = require('./image');
// ... other commands ...

const commands = {};

// Function to register a command
function registerCommand(commandInstance) {
    if (commandInstance instanceof Command) {
        commands[commandInstance.name] = commandInstance;
        logger.info(`Loaded command: ${commandInstance.name}`);
    } else {
        logger.warn(`Provided module is not a Command instance: ${commandInstance.name}`);
    }
}

// Register each command
registerCommand(banCommand);
registerCommand(flowiseCommand);
registerCommand(helpCommand);
registerCommand(httpCommand);
registerCommand(imageCommand);
// ... register other commands ...

logger.debug('Loaded commands:', Object.keys(commands));

module.exports = commands;
