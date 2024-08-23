import ICommand from '../interfaces/ICommand';
import { CommandInteraction } from 'discord.js';
import { muteUser } from '@src/command/common/mute';
import logger from '@src/utils/logger';

const muteCommand: ICommand = {
  name: 'mute',
  description: 'Mutes a user via inline command.',
  async execute(interaction: CommandInteraction) {
    const targetUser = interaction.options.interaction.options.getUser('target') as User || interaction.options.interaction.options.getUser('user') as User;
    const target = targetUser ? interaction.guild?.members.cache.get(targetUser.id) : undefined;

    if (target) {
      await muteUser(interaction, target);
      logger.info('User ' + target.user.tag + ' has been muted.');
      await interaction.reply('User ' + target.user.tag + ' has been muted.');
    } else {
      await interaction.reply('Could not find the specified user.');
    }
  },
};

export default muteCommand;
