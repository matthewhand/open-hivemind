import { ICommand } from '@command/types/Command';
import { handleServerCommand } from '@command/common/server';

export const command: ICommand = {
    name: 'server',
    description: 'Provides information about the server',
    async execute(interaction: CommandInteraction): Promise<void> {
        await handleServerCommand(interaction);
    },
};
