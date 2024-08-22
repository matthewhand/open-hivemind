import axios from 'axios';
import logger from '@src/utils/logger';

export class FlowiseCommand {
    name = 'flowise';
    description = 'Interact with the Flowise API to retrieve information based on the provided endpoint ID.';

    /**
     * Executes the Flowise API command.
     * @param args The command arguments, including an optional endpointId.
     * @returns An object indicating the success of the operation, a message, and optionally any additional data.
     */
    async execute(args: { endpointId?: string }): Promise<{ success: boolean, message: string, error?: string, data?: any }> {
        const { endpointId } = args;

        // Guard: Check if the API base URL is defined in the environment variables
        const apiUrl = process.env.FLOWISE_API_BASE_URL;
        if (!apiUrl) {
            const errorMessage = 'Flowise API base URL is not defined in the environment variables.';
            logger.error(errorMessage);
            return { success: false, message: errorMessage };
        }
        logger.debug('Flowise API base URL: ' + apiUrl);

        // Guard: Ensure endpointId is provided
        if (!endpointId) {
            const errorMessage = 'Endpoint ID is required but was not provided.';
            logger.error(errorMessage);
            return { success: false, message: errorMessage };
        }
        logger.debug('Endpoint ID: ' + endpointId);

        // Construct the full API URL
        const url = apiUrl + endpointId;
        logger.debug('Constructed Flowise API URL: ' + url);

        try {
            // Make a GET request to the Flowise API
            const response = await axios.get(url);
            logger.debug('Flowise API response status: ' + response.status);

            // Return success response with data
            return { success: true, message: 'Request successful', data: response.data };
        } catch (error: any) {
            // Handle and log any errors that occur during the API request
            logger.error('Flowise API request failed: ' + error.message);
            return { success: false, message: 'Flowise API request failed', error: error.message };
        }
    }
}
