import { CommandInteraction, GuildMember } from 'discord.js';
import { ICommand } from '@command/types/ICommand';
import Logger from '@utils/logger';

export async function handleUserCommand(interaction: CommandInteraction): Promise<void> {
    const user = interaction.user;
    const member = interaction.member as GuildMember;

    const joinedDate = member.joinedAt ? member.joinedAt.toDateString() : 'unknown';
    const message = `This command was run by ${user.username}, who joined on ${joinedDate}.`;

    try {
        await interaction.reply(message);
    } catch (error) {
        Logger.error('Failed to send user command reply: ', error);
        throw new Error('Failed to send reply for user command.');
    }
}
