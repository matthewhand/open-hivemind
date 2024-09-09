import axios from 'axios';
import { ConfigurationManager } from '@config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();

const n8nConfig = configManager.getConfig('n8nConfig') as unknown as { N8N_API_BASE_URL: string; N8N_API_KEY: string };

if (!n8nConfig?.N8N_API_BASE_URL || !n8nConfig?.N8N_API_KEY) {
    throw new Error('n8n configuration is missing or incomplete.');
}

const apiClient = axios.create({
    baseURL: n8nConfig.N8N_API_BASE_URL,
    headers: {
        'Authorization': `Bearer ${n8nConfig.N8N_API_KEY}`,
    },
});

export default apiClient;
