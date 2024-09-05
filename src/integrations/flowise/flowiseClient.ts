import axios from 'axios';
import flowiseConfig from '@integrations/flowise/interfaces/flowiseConfig';

if (!flowiseConfig?.FLOWISE_BASE_URL || !flowiseConfig?.FLOWISE_API_KEY) {
    throw new Error('Flowise configuration is missing or incomplete.');
}

const apiClient = axios.create({
    baseURL: flowiseConfig.get('FLOWISE_BASE_URL'),
    headers: {
        'Authorization': `Bearer ${flowiseConfig.get('FLOWISE_API_KEY')}`,
    },
});

export default apiClient;
