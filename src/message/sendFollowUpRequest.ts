import Debug from "debug";
import axios from 'axios';
import configurationManager from '@config/ConfigurationManager';

export async function sendFollowUpRequest(message: string): Promise<any> {
    const OPENAI_BASE_URL = configurationManager.getConfig('OPENAI_BASE_URL', 'https://api.default-llm.com');
    const OPENAI_MODEL = configurationManager.getConfig('OPENAI_MODEL', 'default-model');
    const API_KEY = configurationManager.getConfig('API_KEY', 'default-api-key');

    try {
        const response = await axios.post(OPENAI_BASE_URL, {
            model: OPENAI_MODEL,
            api_key: API_KEY,
            input: message,
        });

        return response.data;
    } catch (error: any) {
        console.error('Error sending follow-up request:', error);
        return null;
    }
}
