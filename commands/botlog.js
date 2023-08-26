
const Discord = require('discord.js');
const fs = require('fs');
const winston = require('winston');

module.exports = {
    name: 'botlog',
    description: 'Fetch and display bot logs.',
    execute(message, args) {
        // Read logs from the file
        fs.readFile('./logs/bot.log', 'utf8', (err, data) => {
            if (err) {
                winston.error(`Error reading log file: ${err}`);
                return message.channel.send('Error reading log file.');
            }
            // Send logs to Discord channel
            const logEmbed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Bot Logs')
                .setDescription(`\`\`\n${data}\`\`\`);
            message.channel.send(logEmbed);
        });
    },
};
