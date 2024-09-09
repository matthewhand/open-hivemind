import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { ConfigurationManager } from '@config/ConfigurationManager';
import { sendStylizedAnnouncement } from './stylizedAnnouncement'; // Import the styling function

// Define the command to set a chat flow for the channel
export const setChatFlowCommand = new SlashCommandBuilder()
  .setName('flowise:setChatFlow')
  .setDescription('Set the chat flow for the current channel.')
  .addStringOption(option =>
    option.setName('chatflow')
      .setDescription('The chatFlow ID to set for this channel.')
      .setRequired(true)
  );

// Execute function for setting the chat flow
export const handleSetChatFlow = async (interaction: CommandInteraction) => {
  const chatFlow = interaction.options.get('chatflow')?.value as string; // Fixed typing for chatFlow
  const channelId = interaction.channelId;

  try {
    const configManager = ConfigurationManager.getInstance();
    
    // Persist the chatFlow for this channel
    configManager.setSession('flowise', channelId, chatFlow);

    // Send the stylized announcement using the utility function
    await sendStylizedAnnouncement(interaction, chatFlow);
  } catch (error) {
    console.error('Error setting chat flow:', error);
    await interaction.reply('Failed to set chat flow.');
  }
};
