import { MessageEmbed, CommandInteraction } from 'discord.js';

/**
 * Sends a styled announcement when a chat flow is set.
 * @param interaction - The command interaction object.
 * @param chatFlow - The chat flow ID or name to announce.
 */
export const sendStylizedAnnouncement = async (interaction: CommandInteraction, chatFlow: string) => {
  const embed = new MessageEmbed()
    .setColor('#0099ff') // Set the color of the embed
    .setTitle('ChatFlow Updated!')
    .setDescription(`**The chat flow has been successfully set to:** \n\n> *${chatFlow}*`)
    .addField('What’s Next?', 'You can now use the new chat flow to interact with Flowise.')
    .setFooter('Flowise Integration', 'https://example.com/logo.png'); // Add an optional footer/logo

  // Send the styled embed message
  await interaction.reply({ embeds: [embed] });
};
