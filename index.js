
const fs = require('node:fs');
const { Client, Collection, Intents } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const allowedUsers = process.env.ALLOWED_USERS.split(',');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
client.commands = new Collection();

const commandFolders = fs.readdirSync('./commands');
for (const folder of commandFolders) {
  const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(`./commands/${folder}/${file}`);
    client.commands.set(command.data.name, command);
  }
}

// Rest of your bot code here
