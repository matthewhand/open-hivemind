const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const winston = require('winston');
const { MessageEmbed } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('botlog')
		.setDescription('Fetch and display bot logs.')
		.addStringOption(option =>
			option.setName('logfile')
				.setDescription('The log file to read from')
				.setRequired(false)
		),
	async execute(interaction) {
		await interaction.deferReply();
		const logFile = interaction.options.getString('logfile') || './logs/bot.log';

		fs.readFile(logFile, 'utf8', (err, data) => {
			if (err) {
				winston.error(`Error reading log file: ${err}`);
				return interaction.followUp('Error reading log file.');
			}

			// Check if data length exceeds Discord's limit
			if (data.length > 2048) {
				data = data.substring(0, 2045) + '...';
			}

			const logEmbed = new MessageEmbed()
				.setColor('#0099ff')
				.setTitle('Bot Logs')
				.setDescription(`\`\`\`${data}\`\`\``);

			interaction.followUp({ embeds: [logEmbed] });
		});
	},
};
