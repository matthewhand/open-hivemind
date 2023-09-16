const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const readline = require('readline');
const winston = require('winston');
const { MessageEmbed } = require('discord.js'); // It should be MessageEmbed, not EmbedBuilder.

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botlog')
        .setDescription('Fetch and display bot logs.'),
    async execute(interaction) {
        await interaction.deferReply();
        
        const fileStream = fs.createReadStream('./logs/bot.log');
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let lastLines = [];
        for await (const line of rl) {
            lastLines.push(line);
            if (lastLines.length > 10) {
                lastLines.shift();
            }
        }
        
        let data = lastLines.reverse().join('\n');
        
        if (data.length > 2048) {
            data = data.substring(0, 2045) + '...';
        }

        const logEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Bot Logs')
            .setDescription(`${data}`);
        
        interaction.followUp({ embeds: [logEmbed] });
    },
};
