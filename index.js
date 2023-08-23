// derived from https://discordjs.guide/creating-your-bot/slash-commands.html
// const { REST, Routes } = require('discord.js');
const { Routes } = require('discord-api-types/v9');
const { REST } = require('@discordjs/rest');
//const { clientId, guildId, token } = require('./config.json');
const clientId = process.env.CLIENT_ID;
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const allowedUsers = process.env.ALLOWED_USERS.split(',');

const fs = require('node:fs');
const path = require('node:path');

const commands = [];
// Grab all the command files from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	if (fs.statSync(commandsPath).isDirectory()) { // Check if it's a directory
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);
			if ('data' in command && 'execute' in command) {
				commands.push(command.data.toJSON());
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}
}


// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();

// client.on('interactionCreate', async (interaction) => {
//   if (!interaction.isCommand()) return;

//   // Get the user ID of the interaction
//   const userId = interaction.user.id;

//   // Check if the user is in the allowed users list
//   if (!allowedUsers.includes(userId)) {
//     console.log(`User ${userId} is not allowed to execute this command.`);
//     return interaction.reply({ content: 'You do not have permission to execute this command.', ephemeral: true });
//   }

//   // Continue with command execution
//   const { commandName } = interaction;
//   const command = client.commands.get(commandName);
//   if (command) {
//     await command.execute(interaction);
//   }
// });

