import { GuildMember, Message } from 'discord.js';
import logger from '@src/utils/logger';

export class BanCommand {
    name = 'ban';
    description = 'Bans a user from the server. Usage: !ban @user [reason]';

    async banUser(message: Message, reason: string): Promise<{ success: boolean, message: string, error?: string }> {
        const targetUser = message.mentions.users.first();
        try {
            const member = await message.guild?.members.fetch(targetUser.id);
            await member?.ban({ reason });
            return { success: true, message: `User ${targetUser.tag} has been banned. Reason: ${reason}` };
        } catch (error: any) {
            logger.error('Failed to ban user: ' + error.message);
            return { success: false, message: 'Failed to ban user.', error: error.message };
        }
    }
}
