import axios from 'axios';
import flowiseConfig from '@integrations/flowise/interfaces/flowiseConfig';

/**
 * Initializes the Flowise API client.
 * Ensures configuration values like FLOWISE_BASE_URL and FLOWISE_API_KEY are present.
 * @throws {Error} If required configuration is missing.
 */
if (!flowiseConfig.get('FLOWISE_BASE_URL')) {
    throw new Error('FLOWISE_BASE_URL is missing.'); // Improvement: Guard and log missing config
}

if (!flowiseConfig.get('FLOWISE_API_KEY')) {
    throw new Error('FLOWISE_API_KEY is missing.');
}

const apiClient = axios.create({
    baseURL: flowiseConfig.get('FLOWISE_BASE_URL') as string, // Fix: Ensure proper type
    headers: {
        'Authorization': `Bearer ${flowiseConfig.get('FLOWISE_API_KEY')}`,
    },
});

console.log('Flowise client initialized with base URL:', flowiseConfig.get('FLOWISE_BASE_URL')); // Improvement: Log configuration

export default apiClient;
