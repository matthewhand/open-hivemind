require('dotenv').config(); // Load environment variables from .env file
const { Client, CommandInteraction, REST, Routes } = require('discord.js');
const { exec } = require('child_process');
const axios = require('axios'); // You'll need to install this package
const pythonCommand = require('./commands/python_command/python');
const queryCommand = require('./commands/query_command/query');

const clientId = process.env.CLIENT_ID;
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

const commands = [
  pythonCommand.data,
  queryCommand.data,
];

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

const client = new Client({ intents: [] });

client.once('ready', () => {
  console.log('Ready!');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'python') {
    await pythonCommand.execute(interaction);
  }

  if (commandName === 'query') {
    await queryCommand.execute(interaction);
  }
});

client.login(token);
