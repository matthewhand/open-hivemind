import Debug from 'debug';
import OpenAI from 'openai';
import ConfigurationManager from '@config/ConfigurationManager';

const debug = Debug('app:sendFollowUpRequest');
const configManager = ConfigurationManager.getInstance();

/**
 * Sends a follow-up request to the OpenAI service using the official client.
 * 
 * This function sends a request to the OpenAI API, passing the provided message as input.
 * It uses the configured API key, model, and other settings from the ConfigurationManager.
 * 
 * Guards are implemented to handle cases where critical configuration values are missing.
 * Debugging logs are included for better traceability of the request process.
 *
 * @param message - The input message to send to the OpenAI API.
 * @returns {Promise<any>} - The response data from the OpenAI API, or null if an error occurred.
 */
export async function sendFollowUpRequest(message: string): Promise<any> {
    const openaiConfig = configManager.getConfig("openai");

    // Guard: Ensure openaiConfig is loaded
    if (!openaiConfig) {
        console.error('OpenAI configuration is not loaded.');
        return null;
    }

    const API_KEY = openaiConfig.get('OPENAI_API_KEY') as string;
    const OPENAI_MODEL = openaiConfig.get('OPENAI_MODEL') as string;

    debug('Sending follow-up request with the following configuration:');
    debug('OPENAI_MODEL:', OPENAI_MODEL);
    debug('API_KEY:', API_KEY);

    // Guard against missing API key
    if (!API_KEY) {
        console.error('Critical configuration missing: API_KEY');
        return null;
    }

    const openai = new OpenAI({ apiKey: API_KEY });

    try {
        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [{ role: 'user', content: message }],
        });

        debug('Received response:', response);
        return response;
    } catch (error: any) {
        console.error('Error sending follow-up request:', error);
        return null;
    }
}
