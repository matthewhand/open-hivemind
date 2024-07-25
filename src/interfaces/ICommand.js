const logger = require('../utils/logger');

/**
 * Interface for commands in the application.
 * @interface ICommand
 */
class ICommand {
    /**
     * Creates an instance of a command.
     * @param {string} name - The name of the command.
     * @param {string} description - The description of what the command does.
     */
    constructor(name, description) {
        if (this.constructor === ICommand) {
            throw new Error('Abstract class ICommand cannot be instantiated directly.');
        }
        this.name = name;
        this.description = description;
        logger.debug('ICommand created: ' + name + ', ' + description);
    }

    /**
     * Executes the command.
     * @abstract
     * @param {string[]} args - The arguments passed to the command.
     * @returns {CommandResponse} The response from the command execution.
     */
    execute(args) {
        logger.debug('Executing command with args: ' + args);
        throw new Error('You have to implement the method execute!');
    }
}

module.exports = ICommand;
