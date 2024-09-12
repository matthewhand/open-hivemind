import Debug from 'debug';
import { banCommand } from '@command/common/ban';
import { IMessage } from '@src/message/interfaces/IMessage';
import { CommandInteraction } from 'discord.js';

const debug = Debug('app:inlineBanCommand');

/**
 * InlineBanCommand
 *
 * Provides an inline command to ban a user in a Discord guild.
 *
 * This command extends the functionality provided by the `banCommand` function
 * and integrates it into the inline command structure, allowing for easier
 * access and execution within Discord.
 */
export class InlineBanCommand {
    async execute(args: { message: IMessage, args: string[] }): Promise<{ success: boolean, message: string, error?: string }> {
        const { message, args: commandArgs } = args;
        const reason = commandArgs.slice(1).join(' ') || 'No reason provided';

        try {
            const target = (message as unknown as CommandInteraction).guild?.members.cache.get(commandArgs[0]);
            if (!target) {
                return { success: false, message: 'User not found.', error: 'User not found' };
            }

            // Execute ban command, now only passing the message as expected.
            await banCommand(message);
            return { success: true, message: `User ${target.user.tag} has been banned for: ${reason}.` };
        } catch (error: any) {
            debug('Error executing InlineBanCommand: ' + error.message);
            return { success: false, message: 'Failed to ban the user.', error: error.message };
        }
    }
}
