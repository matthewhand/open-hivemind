import { Message } from 'discord.js';
import { ICommand } from '../types/ICommand';
import logger from '@utils/logger';

export class BanCommand implements ICommand {
    name = 'ban';
    description = 'Bans a user from the server. Usage: !ban @user [reason]';

    /**
     * Executes the ban command.
     * @param args The command arguments, which should include the message and any additional parameters.
     * @returns An object indicating the success of the operation, a message, and optionally any additional data.
     */
    async execute(args: { message: Message, args: string[] }): Promise<{ success: boolean, message: string, error?: string }> {
        const { message, args: commandArgs } = args;
        
        // Guard: Ensure a user was mentioned
        if (message.mentions.users.size === 0) {
            const errorMessage = 'You need to mention a user to ban.';
            logger.error(errorMessage);
            return { success: false, message: errorMessage };
        }

        const targetUser = message.mentions.users.first();
        const reason = commandArgs.slice(1).join(' ') || 'No reason provided';

        // Guard: Ensure the target user exists
        if (!targetUser) {
            const errorMessage = 'Mentioned user was not found.';
            logger.error(errorMessage);
            return { success: false, message: errorMessage };
        }

        // Attempt to ban the user
        try {
            const member = await message.guild?.members.fetch(targetUser.id);
            if (!member) {
                const errorMessage = 'Member not found in this server.';
                logger.error(errorMessage);
                return { success: false, message: errorMessage };
            }

            await member.ban({ reason });
            const successMessage = `User ${targetUser.tag} has been banned. Reason: ${reason}`;
            logger.info(successMessage);
            return { success: true, message: successMessage };
        } catch (error: any) {
            logger.error('Failed to ban user: ' + error.message);
            return { success: false, message: 'Failed to ban user.', error: error.message };
        }
    }
}
