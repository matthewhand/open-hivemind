import { ICommand } from '@src/types/Command';
import { CommandInteraction } from 'discord.js';
import { muteUser } from '@command/common/mute';
import logger from '@utils/logger';

const muteCommand: ICommand = {
    name: 'mute',
    description: 'Mutes a user via inline command.',
    async execute(interaction: CommandInteraction) {
        const target = interaction.options.getMember('target') as GuildMember;
        if (target) {
            await muteUser(interaction, target);
            Logger.info('User ' + target.user.tag + ' has been muted.');
            await interaction.reply('User ' + target.user.tag + ' has been muted.');
        } else {
            await interaction.reply('Could not find the specified user.');
        }
    },
};

export default muteCommand;
