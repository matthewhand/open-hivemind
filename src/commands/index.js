const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const commandFiles = fs.readdirSync(path.join(__dirname, '.'))
                       .filter(file => file.endsWith('.js') && file !== 'index.js');

const commands = {};

commandFiles.forEach(file => {
    try {
        const command = require(`./${file}`);
        const commandName = file.replace('.js', '');

        // Providing default values if not present in the command module
        if (!command.data) command.data = { name: commandName, description: 'TODO: Description' };
        if (!command.execute) command.execute = async (message) => message.reply('TODO: Command functionality not implemented yet.');

        commands[command.data.name] = command;
        logger.info(`Loaded command: ${command.data.name}`);
    } catch (error) {
        logger.error(`Failed to load command file ${file}: ${error.message}`);
    }
});

// Debug log to check loaded commands
logger.debug(`Loaded commands: ${Object.keys(commands).join(', ')}`);

module.exports = commands;
