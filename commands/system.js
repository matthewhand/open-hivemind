const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('system')
		.setDescription('Set the system for LLM queries')
		.addStringOption(option =>
			option.setName('systemname')
				.setDescription('The name of the system to set')
				.setRequired(true)
		),
	async execute(interaction) {
		const systemName = interaction.options.getString('systemname');
		process.env.LLM_SYSTEM = systemName;  // Store the system name in an environment variable for later use

		await interaction.deferReply(); // Acknowledge the command immediately

		interaction.followUp(`System set to: ${systemName}`);
	},
};
