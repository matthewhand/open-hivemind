const axios = require('axios');
const logger = require('../../utils/logger');
const Command = require('../../utils/Command');
const { getRandomErrorMessage } = require('../../config/errorMessages');

class HttpCommand extends Command {
    constructor() {
        super('http', 'Executes HTTP commands. Usage: !http [action] [query]');
        // Safely parse HTTP_ACTIONS, defaulting to an empty array if it's not set
        this.httpActions = process.env.HTTP_ACTIONS ? process.env.HTTP_ACTIONS.split(',') : [];
        this.httpUrls = this.httpActions.reduce((acc, action) => {
            const url = process.env[`HTTP_${action.toUpperCase()}_URL`];
            if (url) {
                acc[action] = url;
            }
            return acc;
        }, {});
    }

    async execute(message, args=null, action=null) {
        try {
            if (this.httpActions.length === 0) {
                message.reply('No HTTP actions are currently available.');
                return;
            }

            if (!args) {
                const availableActions = this.httpActions.join(', ');
                message.reply(`Available actions: ${availableActions}`);
                return;
            }

            const [action, ...queryParts] = args.split(' ');
            const query = queryParts.join(' ');
            const url = this.httpUrls[action];

            if (!url) {
                logger.error(`Unknown action: ${action}`);
                message.reply(`Unknown action: ${action}`);
                return;
            }

            if (!query) {
                message.reply(`Please provide a query for the action: ${action}.`);
                return;
            }

            const fullUrl = `${url}${encodeURIComponent(query)}`;
            logger.debug(`Sending request to: ${fullUrl}`);

            const response = await axios.get(fullUrl);
            if (response.status === 200 && response.data) {
                const responseText = JSON.stringify(response.data); // Adjust if the response format is different
                message.reply(`Response from ${action}: ${responseText}`);
            } else {
                logger.error(`Error from ${action} API: Status ${response.status}`);
                message.reply(`An error occurred while processing your request to ${action}.`);
            }
        } catch (error) {
            logger.error(`Error in execute (HTTP Command): ${error}`);
            message.reply(getRandomErrorMessage());
        }
    }
}

module.exports = new HttpCommand();
