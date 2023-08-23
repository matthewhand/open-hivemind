require('dotenv').config(); // Load environment variables from .env file
const { Client, CommandInteraction } = require('discord.js');
const { Routes } = require('discord-api-types/v9');
const { REST } = require('@discordjs/rest');
const axios = require('axios');
const fs = require('fs');

const clientId = process.env.CLIENT_ID;
const token = process.env.DISCORD_TOKEN;
// const guildId = process.env.GUILD_ID;

// Dynamically load commands from the commands directory
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data);
}

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationGuildCommands(clientId), { body: commands });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
    // if (error.code === 50001) { // You can specify the error code related to token issues
    //   console.warn('Token issue detected. Token value:', token);
    // }
  }
})();


const client = new Client({ intents: [] });

client.once('ready', () => {
  console.log('Ready!');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  // Dynamically execute the corresponding command
  const command = client.commands.get(commandName);
  if (command) {
    await command.execute(interaction);
  }
});

client.login(token);
