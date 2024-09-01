import Debug from 'debug';
import axios from 'axios';
import ConfigurationManager from '@config/ConfigurationManager';

const debug = Debug('app:replicate');
const configManager = ConfigurationManager.getInstance();

export async function replicateRequest(input: string): Promise<any> {
    const replicateConfig = configManager.getConfig('replicateConfig');
    if (!replicateConfig) {
        throw new Error('Replicate configuration is not loaded.');
    }

    const baseUrl = replicateConfig.get<string>('REPLICATE_BASE_URL');
    const apiToken = replicateConfig.get<string>('REPLICATE_API_TOKEN');
    const modelVersion = replicateConfig.get<string>('REPLICATE_MODEL_VERSION');
    const webhookUrl = configManager.getConfig("webhook")?.get<string>('WEBHOOK_URL');

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
