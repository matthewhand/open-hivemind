const logger = require('../utils/logger');

class Command {
    constructor(name, execute) {
        this.name = name;
        this.execute = execute;
    }

    run(...args) {
        logger.info('Running command: ' + this.name);
        return this.execute(...args);
    }
}

module.exports = Command;
