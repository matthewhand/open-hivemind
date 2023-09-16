const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const readline = require('readline');
const winston = require('winston');
const { MessageEmbed } = require('discord.js'); 

const readLastLines = (path, numberOfLines) => {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(path);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lastLines = [];
    rl.on('line', (line) => {
      lastLines.push(line);
      if (lastLines.length > numberOfLines) {
        lastLines.shift();
      }
    });

    rl.on('close', () => {
      resolve(lastLines.reverse().join('\n'));
    });

    rl.on('error', reject);
  });
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botlog')
        .setDescription('Fetch and display bot logs.'),
    async execute(interaction) {
        await interaction.deferReply();

        try {
          const data = await readLastLines('./logs/bot.log', 10);
          if (data.length > 2048) {
            data = data.substring(0, 2045) + '...';
          }

          const logEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Bot Logs')
            .setDescription(data);
          
          interaction.followUp({ embeds: [logEmbed] });
        } catch (err) {
          winston.error(`Error reading log file: ${err}`);
          interaction.followUp('Error reading log file.');
        }
    },
};
