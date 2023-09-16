const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'botlog',const { MessageEmbed } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: {
    name: 'botlog',
    description: 'Fetches the bot log',
  },
  async execute(interaction) {
    await interaction.deferReply();

    const logsDir = path.join(__dirname, '../logs');
    const logFile = path.join(logsDir, 'bot.log');

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }

    fs.readFile(logFile, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        return interaction.followUp('An error occurred while reading the log file.');
      }

      if (data.length > 2048) {
        data = data.slice(-2045) + '...';  // Getting the last 2045 characters
      }

      const logEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle('Bot Log')
        .setDescription('```' + data.substring(0, 2048) + '```');

      interaction.followUp({ embeds: [logEmbed] });
    });
  },
};

  description: 'Fetches the bot log',
  execute(interaction, client, Discord) {
    const logsDir = path.join(__dirname, '../logs');
    const logFile = path.join(logsDir, 'bot.log');

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }

    fs.readFile(logFile, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        return interaction.reply('An error occurred while reading the log file.');
      }

      if (data.length > 2048) {
        data = data.slice(-2045) + '...';  // Getting the last 2045 characters
      }


      const logEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Bot Log')
        .setDescription('```' + data.substring(0, 2048) + '```');

      interaction.reply({ embeds: [logEmbed] });
    });
  },
};
