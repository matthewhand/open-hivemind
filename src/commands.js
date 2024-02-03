const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');
const commandModules = require('./commands/index'); // Import command modules

const commandExecutors = {};
const commandDataArray = [];

// Iterate over command modules and setup executors and data array
for (const commandName in commandModules) {
  const command = commandModules[commandName];
  if (command.data && command.execute) {
    commandExecutors[command.data.name] = command.execute;
    commandDataArray.push(command.data);
  } else {
    console.warn(`[WARNING] Command '${commandName}' is missing required properties.`);
  }
}

console.info('Commands.js file loaded.');
console.info("Commands initialized.");

// Registering commands with the Discord API
const registerCommands = async (clientId, token, guildId) => {
    const rest = new REST({ version: '9' }).setToken(token);
    try {
        console.log(`Started refreshing ${commandDataArray.length} application (/) commands.`);
        
        if (process.env.DEBUG === 'true') {
            commandDataArray.forEach(command => {
                console.log(`Adding command: ${JSON.stringify(command, null, 2)}`);
            });
        }
        
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commandDataArray },
        );
        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('Error registering commands:', error.message);
    }
};

const handleCommands = (client) => {
    client.on('interactionCreate', async interaction => {
        if (!interaction.isCommand()) return;

        const { commandName } = interaction;
        console.log(`User ${interaction.user.tag} executed command ${commandName}`);

        const command = commandExecutors[commandName];
        if (command) {
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing command ${commandName}: ${error}`);
                await interaction.followUp({ content: 'An error occurred while executing this command.', ephemeral: true });
            }
        } else {
            console.warn(`[WARNING] No command found for ${commandName}`);
        }
    });
};

module.exports = {
    registerCommands,
    handleCommands,
    commandExecutors
};
