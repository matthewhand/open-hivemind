import Debug from "debug";
import { BanCommand } from '@command/common/ban';
import { IMessage } from '@src/message/interfaces/IMessage';

export class InlineBanCommand extends BanCommand {
    async execute(args: { message: IMessage, args: string[] }): Promise<{ success: boolean, message: string, error?: string }> {
        const { message, args: commandArgs } = args;
        const reason = commandArgs.slice(1).join(' ') || 'No reason provided';
        return await this.banUser(message, reason);
    }
}
