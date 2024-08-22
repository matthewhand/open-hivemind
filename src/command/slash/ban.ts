import { BanCommand } from '@command/common/ban';
import { CommandInteraction } from 'discord.js';

export class SlashBanCommand extends BanCommand {
    async execute(interaction: CommandInteraction): Promise<{ success: boolean, message: string, error?: string }> {
        const reason = interaction.options.getString('reason') || 'No reason provided';
        return await this.banUser(interaction, reason);
    }
}
