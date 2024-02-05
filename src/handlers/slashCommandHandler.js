const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const commands = [];
const commandExecutors = {};

const commandsPath = path.join(__dirname, '..', 'commands', 'slash');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        commandExecutors[command.data.name] = command.execute;
    } else {
        logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

const registerCommands = async (clientId, token, guildId) => {
    const rest = new REST({ version: '9' }).setToken(token);
    try {
        logger.info(`Started refreshing ${commands.length} application (/) commands.`);
        
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );
        logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        logger.error('Error registering commands:', error.message);
        if (error.code === 50001) {
            logger.error('Missing Access: The bot does not have permissions to register slash commands in the guild.');
        } else if (error.code === 50013) {
            logger.error('Missing Permissions: The bot lacks necessary permissions to execute this operation.');
        }
        // Handle other specific error codes or scenarios as needed
    }
};

const handleCommands = (client) => {
    client.on('interactionCreate', async interaction => {
        if (!interaction.isCommand()) return;
        const commandExecutor = commandExecutors[interaction.commandName];
        if (commandExecutor) {
            try {
                await commandExecutor(interaction);
            } catch (error) {
                logger.error(`Error executing command ${interaction.commandName}:`, error);
                await interaction.reply({ content: 'An error occurred while executing this command.', ephemeral: true });
            }
        } else {
            logger.warn(`No executor found for command ${interaction.commandName}`);
        }
    });
};

module.exports = {
    registerCommands,
    handleCommands
};

