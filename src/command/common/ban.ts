import { GuildMember } from 'discord.js';
import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';

const debug = Debug('app:command:ban');

export class BanCommand {
    name = 'ban';
    description = 'Bans a user from the server. Usage: !ban @user [reason]';

    async banUser(message: IMessage, reason: string): Promise<{ success: boolean, message: string, error?: string }> {
        debug('BanCommand: Received ban request with message ID ' + message.getMessageId() + ' and reason: ' + reason);

        const targetUser = message.getUserMentions().first();
        if (!targetUser) {
            debug('BanCommand: No user mentioned in the message ID ' + message.getMessageId());
            return { success: false, message: 'No user mentioned to ban.', error: 'No user mentioned' };
        }

        try {
            const member = await message.getGuildMember(targetUser.id);
            if (!member) {
                debug('BanCommand: Failed to fetch GuildMember for user ID ' + targetUser.id);
                return { success: false, message: 'Failed to fetch user details.', error: 'User not found' };
            }

            await member.ban({ reason });
            debug('BanCommand: Successfully banned user ' + targetUser.tag + ' for reason: ' + reason);
            return { success: true, message: 'User ' + targetUser.tag + ' has been banned. Reason: ' + reason };

        } catch (error: any) {
            debug('BanCommand: Error banning user ' + targetUser.id + '. Error: ' + error.message);
            return { success: false, message: 'Failed to ban user.', error: error.message };
        }
    }
}
