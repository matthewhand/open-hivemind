require('dotenv').config(); // Load environment variables from .env file
const { Routes } = require('@discordjs/rest');
const { Client, Intents } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { exec } = require('child_process');

const clientId = process.env.CLIENT_ID;
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const allowedUsers = process.env.ALLOWED_USERS.split(',');

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

const commands = [{
  name: 'python',
  description: 'Execute Python code!',
  options: [{
    name: 'code',
    type: 'STRING',
    description: 'The Python code to execute',
    required: true,
  }],
}];

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', () => {
  console.log('Ready!');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, user } = interaction;

  if (commandName === 'python') {
    if (!allowedUsers.includes(user.id)) {
      return interaction.reply({ content: 'You are not allowed to execute this command.', ephemeral: true });
    }

    const code = interaction.options.getString('code');

    exec(`python -c "${code}"`, (error, stdout, stderr) => {
      let response = '';

      if (error) {
        response = `Error executing code: ${error.message}`;
      } else {
        response = `Output:\n${stdout}\nErrors:\n${stderr}`;
      }

      interaction.reply({ content: response, ephemeral: true });
    });
  }
});

client.login(token);
