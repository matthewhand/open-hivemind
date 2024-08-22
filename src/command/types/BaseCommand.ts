import ICommand from '../interfaces/ICommand';

export abstract class BaseCommand implements ICommand {
    name: string;
    description: string;
    allowedRoles?: string[];

    constructor(name: string, description: string, allowedRoles?: string[]) {
        this.name = name;
        this.description = description;
        this.allowedRoles = allowedRoles;
    }

    abstract execute(args: any): Promise<{ success: boolean, message: string, error?: string }>;

    // Helper method to check if a user is allowed to execute the command
    protected isUserAllowed(userRoles: string[]): boolean {
        if (!this.allowedRoles) return true; // No restrictions
        return userRoles.some(role => this.allowedRoles!.includes(role));
    }
}
