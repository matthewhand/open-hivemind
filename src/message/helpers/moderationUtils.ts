import Debug from "debug";
import configurationManager from '@config/ConfigurationManager';
import axios from 'axios';

export async function moderateMessage(message: string): Promise<boolean> {
    const OPENAI_BASE_URL = configurationManager.getConfig('OPENAI_BASE_URL', 'https://api.default-llm.com');
    const OPENAI_MODEL = configurationManager.getConfig('OPENAI_MODEL', 'default-model');
    const LLM_API_KEY = configurationManager.getConfig('LLM_API_KEY', 'default-key');

    try {
        const response = await axios.post(OPENAI_BASE_URL, {
            model: OPENAI_MODEL,
            api_key: LLM_API_KEY,
            input: message,
        });

        return response.data.flagged;
    } catch (error: any) {
        console.error('Error moderating message:', error);
        return false;
    }
}
