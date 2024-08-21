import logger from '@utils/logger';

/**
 * Represents a command with a name and an execution function.
 */
export class Command {
    public name: string;
    private execute: (...args: any[]) => any;

    /**
     * Constructs a Command instance.
     * @param {string} name - The name of the command.
     * @param {(...args: any[]) => any} execute - The function to execute when the command is run.
     */
    constructor(name: string, execute: (...args: any[]) => any) {
        this.name = name;
        this.execute = execute;
    }

    /**
     * Runs the command with the given arguments.
     * @param {...any[]} args - The arguments to pass to the execution function.
     * @returns {any} - The result of the execution function.
     */
    public run(...args: any[]): any {
        logger.info('Running command: ' + this.name);
        return this.execute(...args);
    }
}

/**
 * Interface for defining command structure.
 */
export interface ICommand {
    name: string;
    description: string;
    allowedRoles?: string[];
    execute(args: any): Promise<{ success: boolean, message: string, error?: string }>;
}
