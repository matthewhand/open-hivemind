const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');

// Function to collect command definitions from slash command files
function collectSlashCommands(commandsPath) {
    const commands = [];
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if (command.data) commands.push(command.data.toJSON());
    }

    return commands;
}

// Function to register slash commands with Discord
async function registerSlashCommands(clientId, token, guildId, commands) {
    const rest = new REST({ version: '9' }).setToken(token);
    try {
        console.log(`Registering ${commands.length} slash commands.`);
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log('Successfully registered slash commands.');
    } catch (error) {
        console.error('Failed to register slash commands:', error);
    }
}

module.exports = {
    collectSlashCommands,
    registerSlashCommands,
};
