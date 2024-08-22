export interface ICommand {
    name: string;
    description: string;
    allowedRoles?: string[];
    execute(args: any): Promise<{ success: boolean, message: string, error?: string }>;
}
