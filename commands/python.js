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
		await interaction.deferReply(); // Acknowledge the command immediately
		// Check if the user is in the allowed users list
		const userId = interaction.user.id;

		const guild = interaction.guild; // Get the guild (server) where the command was executed
		const member = interaction.member; // Get the member who executed the command

		// Check if the member is the owner of the guild
		if ((guild.ownerId !== member.id) && (!allowedUsers.includes(userId))) {
			return interaction.followUp({ content: 'You do not have permission to execute this command.', ephemeral: true });
		}

		const code = interaction.options.getString('code');
		const escapedCode = code.replace(/"/g, '\\"'); // Escape double quotes

		console.log(`Executing Python code: ${escapedCode}`); // Print the code argument

		exec(`python -c "${escapedCode}"`, (error, stdout, stderr) => {
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
