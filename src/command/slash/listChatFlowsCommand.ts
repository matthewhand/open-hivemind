import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import axios from 'axios';
import flowiseConfig from '@integrations/flowise/flowiseConfig';

// Define the command to list chat flows
export const listChatFlowsCommand = new SlashCommandBuilder()
  .setName('flowise:listChatFlows')
  .setDescription('List all available Flowise chat flows.');

// Execute function for listing chat flows
export const handleListChatFlows = async (interaction: CommandInteraction) => {
  try {
    const baseURL = flowiseConfig.get('FLOWISE_API_ENDPOINT');
    const apiKey = flowiseConfig.get('FLOWISE_API_KEY');
    
    // Get available chat flows
    const response = await axios.get(`${baseURL}/chatflows`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const chatFlows = response.data;

    if (chatFlows.length === 0) {
      await interaction.reply('No chat flows available.');
    } else {
      const formattedChatFlows = chatFlows.map((flow: any) => `${flow.id}: ${flow.name}`).join('\n');
      await interaction.reply(`Available chat flows:\n${formattedChatFlows}`);
    }
  } catch (error) {
    console.error('Error fetching chat flows:', error);
    await interaction.reply('Failed to retrieve chat flows.');
  }
};
