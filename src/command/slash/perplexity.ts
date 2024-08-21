import { SlashCommandBuilder } from 'discord.js';
import { searchPerplexity } from '@command/common/perplexity';
import { CommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('perplexity')
    .setDescription('Perform a search using Perplexity')
    .addStringOption(option =>
        option.setName('query')
            .setDescription('The search query')
            .setRequired(true)
    );

export async function execute(interaction: CommandInteraction) {
    const query = interaction.options.getString('query', true);
    await interaction.deferReply();
    try {
        const result = await searchPerplexity(query);
        await interaction.editReply(result);
    } catch (error) {
        await interaction.editReply('Sorry, I could not retrieve the results.');
    }
}
