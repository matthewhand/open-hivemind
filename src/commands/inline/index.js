const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const Command = require('../../utils/Command');

const commandsDirectory = path.join(__dirname, '.');
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
