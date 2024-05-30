const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const Command = require('../../utils/Command');

/**
 * Dynamically loads all command modules from the current directory, excluding index.js itself.
 * Each command module must export an instance of the Command class. This script logs all loaded commands.
 */
const commandsDirectory = __dirname;  // Use __dirname to refer to the current directory path
const commandFiles = fs.readdirSync(commandsDirectory).filter(file => file.endsWith('.js') && file !== 'index.js');

const commands = {};

commandFiles.forEach(file => {
    const filePath = path.join(commandsDirectory, file);
    const commandModule = require(filePath);

    let commandInstance;
    if (commandModule instanceof Command) {
        commandInstance = commandModule;
    } else if (typeof commandModule === 'function') {
        commandInstance = new commandModule();
    } else if (typeof commandModule === 'object' && commandModule !== null && commandModule.execute) {
        commandInstance = commandModule;
    } else {
        logger.warn(`File ${file} does not export a Command instance or valid class.`);
        return;
    }

    if (commandInstance && commandInstance.name && commandInstance.execute) {
        commands[commandInstance.name] = commandInstance;
        logger.info(`Dynamically loaded command: ${commandInstance.name}`);
    } else {
        logger.warn(`File ${file} does not export a valid Command instance or class.`);
    }
});

logger.info('Dynamically loaded commands:', Object.keys(commands));

module.exports = commands;
