const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const logger = require('./utils/logger');

// Import your command modules here
const BanCommand = require('./commands/ban');
const FlowiseCommand = require ('./commands/flowise');
const HelpCommand = require('./commands/help');
// ... import other commands

const commandExecutors = {};
const commandDataArray = [];

// Add each command module to the executors and data array
const commands = [BanCommand, FlowiseCommand, HelpCommand /*, ... other commands */];
commands.forEach(command => {
    if (command.data && command.execute) {
        commandExecutors[command.data.name] = command.execute;
        commandDataArray.push(command.data);
        logger.debug(`Command setup: ${command.data.name} with data:`, command.data); // Detailed command data
    } else {
        logger.warn(`[WARNING] Command '${command.data.name}' is missing required properties.`);
    }
});

console.info('Commands.js file loaded.');
console.info('Commands initialized.');

// ... rest of your code remains unchanged
