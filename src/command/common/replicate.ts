import Debug from 'debug';
import axios from 'axios';
import ConfigurationManager from '@common/config/ConfigurationManager';

const debug = Debug('app:replicate');
const configManager = ConfigurationManager.getInstance();

export async function replicateRequest(input: string): Promise<any> {
    const baseUrl = configManager.REPLICATE_BASE_URL;
    const apiToken = configManager.REPLICATE_API_TOKEN;
    const modelVersion = configManager.REPLICATE_MODEL_VERSION;
    const webhookUrl = configManager.WEBHOOK_URL;

    if (!baseUrl || !apiToken || !modelVersion) {
        debug('Missing required configurations for Replicate API');
        return null;
    }

    try {
        const response = await axios.post(`${baseUrl}/predictions`, {
            version: modelVersion,
            input: { prompt: input },
            webhook: webhookUrl,
        }, {
            headers: { Authorization: `Token ${apiToken}` }
        });

        return response.data;
    } catch (error: any) {
        debug('Error in replicateRequest:', error);
        return null;
    }
}
