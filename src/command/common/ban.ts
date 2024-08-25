import { GuildMember } from 'discord.js';
import { IMessage } from '@src/message/interfaces/IMessage';
import logger from '@src/utils/logger';

export class BanCommand {
    name = 'ban';
    description = 'Bans a user from the server. Usage: !ban @user [reason]';

    /**
     * Bans a user from the guild based on the provided message and reason.
     * 
     * @param message - The message that triggered the command, expected to contain user mentions.
     * @param reason - The reason for banning the user.
     * @returns An object indicating the success or failure of the ban operation.
     */
    async banUser(message: IMessage, reason: string): Promise<{ success: boolean, message: string, error?: string }> {
        // Log the incoming message and reason for debugging purposes
        logger.debug('BanCommand: Received ban request with message ID ' + message.getMessageId() + ' and reason: ' + reason);

        // Guard: Ensure that at least one user is mentioned in the message
        const targetUser = message.getUserMentions().first(); // Assuming IMessage provides a method to get user mentions
        if (!targetUser) {
            logger.warn('BanCommand: No user mentioned in the message ID ' + message.getMessageId());
            return { success: false, message: 'No user mentioned to ban.', error: 'No user mentioned' };
        }

        try {
            // Attempt to fetch the guild member and ban them
            const member = await message.getGuildMember(targetUser.id); // Abstracted method to fetch guild member
            if (!member) {
                logger.warn('BanCommand: Failed to fetch GuildMember for user ID ' + targetUser.id);
                return { success: false, message: 'Failed to fetch user details.', error: 'User not found' };
            }

            await member.ban({ reason });
            logger.info('BanCommand: Successfully banned user ' + targetUser.tag + ' for reason: ' + reason);
            return { success: true, message: 'User ' + targetUser.tag + ' has been banned. Reason: ' + reason };

        } catch (error: any) {
            // Log the error and return failure
            logger.error('BanCommand: Error banning user ' + targetUser.id + '. Error: ' + error.message);
            return { success: false, message: 'Failed to ban user.', error: error.message };
        }
    }
}
