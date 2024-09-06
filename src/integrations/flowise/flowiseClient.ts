import axios from 'axios';
import flowiseConfig from '@integrations/flowise/interfaces/flowiseConfig';

/**
 * Initializes the Flowise API client.
 * Ensures configuration values like FLOWISE_BASE_URL and FLOWISE_API_KEY are present.
 * @throws {Error} If required configuration is missing.
 */
if (!flowiseConfig.get('FLOWISE_BASE_URL') || !flowiseConfig.get('FLOWISE_API_KEY')) { // Fix: Correct config access
    throw new Error('Flowise configuration is missing or incomplete.');
}

const apiClient = axios.create({
    baseURL: flowiseConfig.get('FLOWISE_BASE_URL') as string, // Fix: Ensure proper type
    headers: {
        'Authorization': `Bearer ${flowiseConfig.get('FLOWISE_API_KEY')}`,
    },
});

export default apiClient;
