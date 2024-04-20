const ICommand = require('../../interfaces/ICommand');
const logger = require('../../utils/logger');

/**
 * Executes HTTP requests.
 * Usage: !http <url>
 */
class HTTPCommand extends ICommand {
    constructor() {
        super();
        this.name = 'http';  // Command name is same as the filename "http.js" minus ".js"
        this.description = 'Executes HTTP requests. Usage: !http <url>';
    }

    async execute(args) {
        if (args.length === 0) {
            logger.error('HTTPCommand: No URL provided');
            return { success: false, message: "Please provide a URL." };
        }
        const url = args[0];
        try {
            const response = await fetch(url);  // Assuming 'fetch' is available
            const data = await response.json();
            logger.info(`HTTPCommand: Successfully fetched data from ${url}`);
            return { success: true, message: "Data fetched successfully", data };
        } catch (error) {
            logger.error(`HTTPCommand: Error fetching data from ${url} - ${error}`);
            return { success: false, message: "Failed to fetch data", error: error.message };
        }
    }
}

module.exports = HTTPCommand;
