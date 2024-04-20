const axios = require('axios');
const ICommand = require('../../interfaces/ICommand');
const logger = require('../../utils/logger');
const { getRandomErrorMessage } = require('../../config/errorMessages');

class FlowiseCommand extends ICommand {
    constructor() {
        super();
        this.name = 'flowise';
        this.description = 'Sends a query to the Flowise API. Usage: !flowise [action] [query]';
    }

    async execute(args) {
        if (args.length < 2) {
            logger.error('FlowiseCommand: Insufficient arguments');
            return { success: false, message: "Usage: !flowise [action] [query]" };
        }

        const action = args[0];
        const query = args.slice(1).join(' ');

        const validActions = process.env.FLOWISE_ACTIONS ? process.env.FLOWISE_ACTIONS.split(',') : [];
        if (!validActions.includes(action)) {
            logger.error(`FlowiseCommand: Invalid action '${action}'`);
            return { success: false, message: `Invalid action specified. Available actions are: ${validActions.join(', ')}` };
        }

        const endpointId = process.env[`FLOWISE_${action.toUpperCase()}_ID`];
        const url = `${process.env.FLOWISE_API_BASE_URL}${endpointId}`;
        logger.debug(`FlowiseCommand: Calling API at ${url} with query '${query}'`);

        try {
            const response = await axios.post(url, { question: query });
            if (response.status === 200 && response.data.success) {
                logger.info(`FlowiseCommand: Received successful response from Flowise API`);
                return { success: true, message: response.data.text };
            } else {
                logger.error(`FlowiseCommand: Failed API call with status ${response.status}`);
                return { success: false, message: getRandomErrorMessage() };
            }
        } catch (error) {
            logger.error(`FlowiseCommand: Error during API call - ${error.message}`);
            return { success: false, message: getRandomErrorMessage(), error: error.message };
        }
    }
}

module.exports = FlowiseCommand;  // Correctly exporting the class
