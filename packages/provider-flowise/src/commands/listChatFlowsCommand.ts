import { SlashCommandBuilder } from '@discordjs/builders';
import type { CommandInteraction } from 'discord.js';
import { flowiseListChatFlows } from '@integrations/flowise/rest/flowiseListChatFlows';

/**
 * Slash command for /flowise:listChatFlows.
 */
export const listChatFlowsCommand = new SlashCommandBuilder()
  .setName('flowise:listChatFlows')
  .setDescription('List all available Flowise chat flows.');

/**
 * Execute the slash command to list chat flows.
 */
export const handleListChatFlows = async (interaction: CommandInteraction) => {
  const chatFlows = await flowiseListChatFlows();
  await interaction.reply(chatFlows);
};
