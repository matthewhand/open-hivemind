import configurationManager from '@src/common/config/ConfigurationManager';
import axios from 'axios';

export async function moderateMessage(message: string): Promise<boolean> {
    const LLM_ENDPOINT_URL = configurationManager.getConfig('LLM_ENDPOINT_URL', 'https://api.default-llm.com');
    const LLM_MODEL = configurationManager.getConfig('LLM_MODEL', 'default-model');
    const LLM_API_KEY = configurationManager.getConfig('LLM_API_KEY', 'default-key');

    try {
        const response = await axios.post(LLM_ENDPOINT_URL, {
            model: LLM_MODEL,
            api_key: LLM_API_KEY,
            input: message,
        });

        return response.data.flagged;
    } catch (error: any) {
        console.error('Error moderating message:', error);
        return false;
    }
}
