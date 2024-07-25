class ICommand {
    constructor() {
        if (this.constructor === ICommand) {
            throw new Error('Abstract classes cannot be instantiated.');
        }
    }

    /**
     * Execute the command.
     * @param {object} args - The arguments for the command.
     */
    async execute(args) {
        throw new Error('Method execute() must be implemented.');
    }
}

module.exports = ICommand;
