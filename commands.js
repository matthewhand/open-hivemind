const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandExecutors = {};
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		commands.push(command.data);
		commandExecutors[command.data.name] = command.execute;
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

const registerCommands = async (clientId, token, guildId) => {
	const rest = new REST({ version: '9' }).setToken(token);
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);
		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);
		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
};

const handleCommands = (client) => {
	client.on('interactionCreate', async interaction => {
		if (!interaction.isCommand()) return;
		const { commandName } = interaction;
		const user = interaction.user.tag;
		console.log(`User ${user} executed command ${commandName}`);
		const commandExecutor = commandExecutors[commandName];
		if (commandExecutor) {
			try {
				await commandExecutor(interaction);
			} catch (error) {
				console.error(`Error executing command ${commandName}: ${error}`);
				await interaction.reply({ content: 'An error occurred while executing this command.', ephemeral: true });
			}
		} else {
			console.log(`[WARNING] No executor found for command ${commandName}`);
		}
	});
};

module.exports = {
	registerCommands,
	handleCommands,
};
