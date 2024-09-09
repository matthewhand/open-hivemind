import { EmbedBuilder, CommandInteraction } from 'discord.js';

/**
 * Sends a styled announcement when a chat flow is set.
 * @param interaction - The command interaction object.
 * @param chatFlow - The chat flow ID or name to announce.
 */
export const sendStylizedAnnouncement = async (interaction: CommandInteraction, chatFlow: string) => {
  const embed = new EmbedBuilder()
    .setColor('#0099ff') // Set the color of the embed
    .setTitle('ChatFlow Updated!')
    .setDescription(`**The chat flow has been successfully set to:** \n\n> *${chatFlow}*`)
    .addFields({ name: 'What’s Next?', value: 'You can now use the new chat flow to interact with Flowise.' })
    .setFooter({ text: 'Flowise Integration', iconURL: 'https://matthewhand.github.io/discord-llm-bot/logo.png' });

  // Send the styled embed message
  await interaction.reply({ embeds: [embed] });
};
