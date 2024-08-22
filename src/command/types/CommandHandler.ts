import { ICommand } from '@src/types/ICommand';

export class CommandHandler implements ICommand {
    name: string;
    description: string;
    allowedRoles?: string[];

    constructor(name: string, description: string, allowedRoles?: string[]) {
        this.name = name;
        this.description = description;
        this.allowedRoles = allowedRoles;
    }

    async execute(args: any): Promise<{ success: boolean, message: string, error?: string }> {
        try {
            // Implementation of command logic here
            return { success: true, message: 'Command executed successfully.' };
        } catch (error) {
            return { success: false, message: 'Command execution failed.', error: (error as Error).message };
        }
    }
}
