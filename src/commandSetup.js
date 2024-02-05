const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

const commandExecutors = {};
const commandDataArray = [];

// Dynamically load command modules
const commandsDirectory = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsDirectory).filter(file => file.endsWith('.js'));

commandFiles.forEach(file => {
    const filePath = path.join(commandsDirectory, file);
    const commandModule = require(filePath);

    // Add command to executors and data array if it has required properties
    if (commandModule.data && typeof commandModule.execute === 'function') {
        commandExecutors[commandModule.data.name] = commandModule.execute;
        commandDataArray.push(commandModule.data);
        logger.debug(`Dynamically loaded command: ${commandModule.data.name} with data:`, commandModule.data);
    } else {
        logger.warn(`[WARNING] Command module '${file}' is missing required properties.`);
    }
});

console.info('Commands.js file loaded.');
console.info('Commands initialized.');

// ... rest of your code for registering commands with Discord API remains unchanged

module.exports = {
    commandExecutors,
    commandDataArray
};
