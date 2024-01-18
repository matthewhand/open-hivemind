const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Provides information about available commands.'),

    async execute(interaction) {
        const helpMessage = `
**Help - Available Commands**
1. **/analyze** - Analyze and describe an image.
2. **/perplexity** - Use the Perplexity LLM to answer questions.
3. **/quivr** - Use the Quivr service for advanced query handling.
4. **/flowise** - Interact with the Flowise service for various functionalities.
5. **/python** - Execute Python code blocks in your messages.
6. **/config_update** - Update bot configuration settings dynamically (restricted to authorized users).

Use each command followed by its required options or parameters. For example, "/perplexity [your question]" to get an answer using the Perplexity LLM.

For more detailed information on each command, refer to the bot's documentation or use "/command_name --help" if available.
        `;

        await interaction.reply(helpMessage);
    }
};

