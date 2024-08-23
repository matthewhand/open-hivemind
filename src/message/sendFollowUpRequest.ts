import axios from 'axios';
import configurationManager from '@src/common/config/ConfigurationManager';

export async function sendFollowUpRequest(message: string): Promise<any> {
    const LLM_ENDPOINT_URL = configurationManager.getConfig('LLM_ENDPOINT_URL', 'https://api.default-llm.com');
    const LLM_MODEL = configurationManager.getConfig('LLM_MODEL', 'default-model');
    const API_KEY = configurationManager.getConfig('API_KEY', 'default-api-key');

    try {
        const response = await axios.post(LLM_ENDPOINT_URL, {
            model: LLM_MODEL,
            api_key: API_KEY,
            input: message,
        });

        return response.data;
    } catch (error: any) {
        console.error('Error sending follow-up request:', error);
        return null;
    }
}
