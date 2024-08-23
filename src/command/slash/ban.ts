import { CommandInteraction } from 'discord.js';
import { banUser } from '@src/command/common/ban';
import ICommand from '../interfaces/ICommand';

const banCommand: ICommand = {
  name: 'ban',
  description: 'Bans a user via inline command.',
  async execute(interaction: CommandInteraction) {
    const targetUser = interaction.options.interaction.options.getUser('target') as User || interaction.options.getUser('user');
    const reason = interaction.options.interaction.options.getString('reason') as string || 'No reason provided';

    if (targetUser) {
      await banUser(interaction, targetUser, reason);
    } else {
      await interaction.reply('Could not find the specified user.');
    }
  },
};

export default banCommand;
