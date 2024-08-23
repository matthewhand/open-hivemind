import { CommandInteraction } from 'discord.js';
import { banUser } from '@src/command/common/ban';
import ICommand from '../interfaces/ICommand';

const SlashBanCommand: ICommand = {
  name: 'ban',
  description: 'Bans a user via slash command.',
  async execute(interaction: CommandInteraction) {
    const targetUser = interaction.options.getUser('target') || interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (targetUser) {
      await banUser(interaction, targetUser, reason);
    } else {
      await interaction.reply('Could not find the specified user.');
    }
  },
};

export default SlashBanCommand;
