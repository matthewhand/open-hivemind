const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const winston = require('winston');
const { MessageEmbed } = require('discord.js');  // Changed from EmbedBuilder to MessageEmbed

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
                data = data.slice(-2045) + '...';  // Getting the last 2045 characters
            }
            
            const logEmbed = new MessageEmbed()  // Changed from EmbedBuilder to MessageEmbed
                .setColor('#0099ff')
                .setTitle('Bot Logs')
                .setDescription(`${data}`);
                
            interaction.followUp({ embeds: [logEmbed] });
        });
    },
};
