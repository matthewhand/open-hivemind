import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { flowiseSetChatFlow } from '@integrations/flowise/shared/flowiseSetChatFlow';

/**
 * Slash command for /flowise:setChatFlow.
 */
export const setChatFlowCommand = new SlashCommandBuilder()
  .setName('flowise:setChatFlow')
  .setDescription('Set the chat flow for the current channel.')
  .addStringOption(option =>
    option.setName('chatflow')
      .setDescription('The chatFlow ID to set for this channel.')
      .setRequired(true)
  );

/**
 * Execute the slash command to set chat flow.
 */
export const handleSetChatFlow = async (interaction: CommandInteraction) => {
  const chatFlow = interaction.options.get('chatflow')?.value as string;  // Fixing typing issue here
  const channelId = interaction.channelId;

  const response = await flowiseSetChatFlow(channelId, chatFlow);
  await interaction.reply(response);
};
