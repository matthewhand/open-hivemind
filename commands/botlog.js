const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const winston = require('winston');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botlog')
        .setDescription('Fetch and display bot logs.'),
    async execute(interaction) {
        await interaction.deferReply();
        fs.readFile('./logs/bot.log', 'utf8', (err, data) => {
            if (err) {
                winston.error(`Error reading log file: ${err}`);
                return interaction.followUp('Error reading log file.');
            }
            if (data.length > 2048) {
                data = data.substring(0, 2045) + '...';
            }
            const logEmbed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Bot Logs')
                .setDescription(`\`\`\`${data}\`\`\``);
            interaction.followUp({ embeds: [logEmbed] });
        });
    },
};
