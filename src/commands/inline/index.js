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

    if (commandModule instanceof Command) {
        commands[commandModule.name] = commandModule;
        logger.info(`Dynamically loaded command: ${commandModule.name}`);
    } else {
        logger.warn(`File ${file} does not export a Command instance.`);
    }
});

logger.info('Dynamically loaded commands:', Object.keys(commands));

module.exports = commands;
