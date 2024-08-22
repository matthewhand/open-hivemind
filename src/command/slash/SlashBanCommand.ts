import { SlashCommand } from '../types/SlashCommand';
import { CommandInteraction } from 'discord.js';
import logger from '@utils/logger';
import { BanCommand } from '@command/common/ban';

export class SlashBanCommand extends BanCommand implements SlashCommand {
    async execute(interaction: CommandInteraction): Promise<{ success: boolean, message: string, error?: string }> {
        const targetUser = interaction.options.getUser('target');
        if (!targetUser) {
            const errorMessage = 'You need to mention a user to ban.';
            logger.error(errorMessage);
            return { success: false, message: errorMessage };
        }
        const reason = interaction.options.getString('reason') || 'No reason provided';
        return await this.banUser(interaction, reason);
    }
}
