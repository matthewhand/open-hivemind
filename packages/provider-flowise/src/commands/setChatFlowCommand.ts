import type { ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { flowiseSetChatFlow } from '@hivemind/provider-flowise/rest/flowiseSetChatFlow';

/**
 * Slash command for /flowise:setChatFlow.
 */
export const setChatFlowCommand = new SlashCommandBuilder()
  .setName('flowise:setChatFlow')
  .setDescription('Set the chat flow for the current channel.')
  .addStringOption((option: any) =>
    option
      .setName('chatflow')
      .setDescription('The chatFlow ID to set for this channel.')
      .setRequired(true)
  );

/**
 * Execute the slash command to set chat flow.
 */
export const handleSetChatFlow = async (interaction: ChatInputCommandInteraction) => {
  const chatFlow = interaction.options.getString('chatflow');
  const channelId = interaction.channelId;

  if (!chatFlow) {
    await interaction.reply('Error: ChatFlow ID is required.');
    return;
  }

  const response = await flowiseSetChatFlow(channelId, chatFlow);
  await interaction.reply(response);
};
