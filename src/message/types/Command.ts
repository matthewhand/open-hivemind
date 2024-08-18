import logger from '../logger';

type ExecuteFunction = (...args: any[]) => any;

/**
 * Represents a command with a name and an execution function.
 */
export class Command {
    public name: string;
    private execute: ExecuteFunction;

    /**
     * Constructs a Command instance.
     * @param {string} name - The name of the command.
     * @param {ExecuteFunction} execute - The function to execute when the command is run.
     */
    constructor(name: string, execute: ExecuteFunction) {
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
