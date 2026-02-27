import { SlashCommandBuilder } from '@discordjs/builders';

export const SpecifyCommand = {
  data: new SlashCommandBuilder()
    .setName('speckit')
    .setDescription('Generate a structured specification from a natural language description.')
    .addStringOption((option) =>
      option.setName('topic').setDescription('The topic for the specification.').setRequired(true)
    ),
};
