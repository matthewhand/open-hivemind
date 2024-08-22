import { BanCommand } from '@command/common/ban';
import { Message } from 'discord.js';
export class InlineBanCommand extends BanCommand {
    async execute(args: { message: Message, args: string[] }): Promise<{ success: boolean, message: string, error?: string }> {
        const { message, args: commandArgs } = args;
        const reason = commandArgs.slice(1).join(' ') || 'No reason provided';
        return await this.banUser(message, reason);
    }
}
