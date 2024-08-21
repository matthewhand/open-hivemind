import { CommandInteraction } from 'discord.js';
import { ICommand } from '@command/types/Command';
import { handleUserCommand } from '@command/common/user';

const userCommand: ICommand = {
    name: 'user',
    description: 'Displays information about the user',
    execute: async (interaction: CommandInteraction) => {
        await handleUserCommand(interaction);
    }
};

export default userCommand;
