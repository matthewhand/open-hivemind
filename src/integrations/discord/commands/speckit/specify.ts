import { SlashCommandBuilder } from 'discord.js';

export const SpecifyCommand = {
    data: new SlashCommandBuilder()
        .setName('speckit')
        .setDescription('Speckit commands for generating specifications.')
        .addSubcommand(subcommand => {
            subcommand
                .setName('specify')
                .setDescription('Generate a structured specification from a natural language description.')
                .addStringOption(option =>
                    option.setName('topic')
                        .setDescription('The topic for the specification.')
                        .setRequired(true)
                );
            return subcommand;
        }),
    execute: async (interaction: any) => {
        // This will be handled by the interactionCreate event in DiscordService
        // This function exists for compatibility with the command collection system
        return interaction.reply({ content: 'Command handled by interaction handler.', ephemeral: true });
    }
};