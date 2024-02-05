class Command {
    constructor(name, description) {
        this.name = name;
        this.description = description;
    }

    async execute(message, args) {
        throw new Error('execute method must be implemented');
    }
    
    async handleException(message, error) {
        logger.error(`Error in ${this.name}: ${error.message}`);
        message.reply('An error occurred while processing your request.');
    }
}

module.exports = Command;
