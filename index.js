
const { Client, Intents } = require('discord.js');
const express = require('express');
const app = express();
const port = 3000;

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand() || interaction.commandName !== 'python') return;

  const pythonCode = interaction.options.getString('code');
  if (!pythonCode) return;

  exec(`python -c "${pythonCode}"`, (error, stdout, stderr) => {
    if (error) {
      interaction.reply(`Error executing Python code: ${error.message}`);
      return;
    }
    if (stderr) {
      interaction.reply(`Python Error: ${stderr}`);
      return;
    }
    interaction.reply(`Python Output: ${stdout}`);
  });
});

app.post('/webhook', (req, res) => {
  // Handle webhook here
});

client.login(process.env.DISCORD_TOKEN);
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
