import axios from 'axios';
import ConfigurationManager from '@config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();

const flowiseConfig = configManager.getConfig('flowiseConfig') as unknown as { FLOWISE_BASE_URL: string; FLOWISE_API_KEY: string };

if (!flowiseConfig?.FLOWISE_BASE_URL || !flowiseConfig?.FLOWISE_API_KEY) {
    throw new Error('Flowise configuration is missing or incomplete.');
}

const apiClient = axios.create({
    baseURL: flowiseConfig.FLOWISE_BASE_URL,
    headers: {
        'Authorization': `Bearer ${flowiseConfig.FLOWISE_API_KEY}`,
    },
});

export default apiClient;
