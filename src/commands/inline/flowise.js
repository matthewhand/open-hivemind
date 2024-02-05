const axios = require('axios');
const logger = require('../../utils/logger');
const { getRandomErrorMessage } = require('../../config/errorMessages');
const Command = require('../../utils/Command');

class FlowiseCommand extends Command {
    constructor() {
        super('flowise', 'Sends a query to the Flowise API. Usage: !flowise:[action] [query]');
    }

    async execute(message, args) {
        try {
            let action = '';
            let query = '';

            if (typeof args === 'string') {
                const parts = args.split(' ');
                action = parts[0];
                query = parts.slice(1).join(' ');
            }

            const flowiseActions = process.env.FLOWISE_ACTIONS.split(',');
            if (!action || !flowiseActions.includes(action)) {
                message.reply(`Please specify a valid action. Available Flowise actions: ${flowiseActions.join(', ')}`);
                return;
            }

            if (!query) {
                message.reply(`Please provide a query for Flowise action "${action}".`);
                return;
            }

            const flowiseEndpointId = process.env[`FLOWISE_${action.toUpperCase()}_ID`];
            const flowiseUrl = `${process.env.FLOWISE_API_BASE_URL}${flowiseEndpointId}`;

            logger.debug(`Sending request to Flowise: ${flowiseUrl} with action: ${action} and query: ${query}`);
            const response = await axios.post(flowiseUrl, { question: query });

            if (response.status === 200) {
                const flowiseText = response.data.text;
                message.reply(`Flowise "${action}" response: ${flowiseText}`);
            } else {
                logger.error(`Error from Flowise API: ${response.status} - ${response.statusText}`);
                message.reply(getRandomErrorMessage());
            }
        } catch (error) {
            logger.error(`Error in Flowise request: ${error}`);
            message.reply(getRandomErrorMessage());
        }
    }
}

module.exports = new FlowiseCommand();
