
const { Client, Intents } = require('discord.js');
const express = require('express');
const app = express();
const port = 3000;

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'python') {
    // Execute Python code here
  }
});

app.post('/webhook', (req, res) => {
  // Handle webhook here
});

client.login('YOUR_TOKEN_HERE');
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
