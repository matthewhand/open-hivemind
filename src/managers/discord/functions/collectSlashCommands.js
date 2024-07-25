const fs = require('fs');
const path = require('path');

/**
 * Collects slash command definitions from command files within a specified directory.
 * @param {string} commandsPath - The path to the directory containing command files.
 * @returns {Object[]} An array of command definitions ready to be registered with Discord.
 */
function collectSlashCommands(commandsPath) {
    const commands = [];
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if (command.data) commands.push(command.data.toJSON());
    }

    return commands;
}

module.exports = collectSlashCommands;
