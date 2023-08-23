const { SlashCommandBuilder } = require('@discordjs/builders');
const { exec } = require('child_process');
const allowedUsers = process.env.ALLOWED_USERS.split(',');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('python')
		.setDescription('Execute Python code')
		.addStringOption(option =>
			option.setName('code')
				.setDescription('The Python code to execute')
				.setRequired(true)
		),
	async execute(interaction) {
		// Check if the user is in the allowed users list
		const userId = interaction.user.id;
		if (!allowedUsers.includes(userId)) {
			return interaction.followUp({ content: 'You do not have permission to execute this command.', ephemeral: true });
		}

		const code = interaction.options.getString('code');

		exec(`python -c "${code}"`, (error, stdout, stderr) => {
			if (error) {
				interaction.followUp(`Error executing code: ${error.message}`);
				return;
			}
			if (stderr) {
				interaction.followUp(`Stderr: ${stderr}`);
				return;
			}
			interaction.followUp(`Stdout: ${stdout}`);
		});
	},
};
