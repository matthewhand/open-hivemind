import Debug from "debug";
import ConfigurationManager from '@config/ConfigurationManager';
import axios from 'axios';

export async function replicateImageAnalysis(imageUrl: string): Promise<any> {
    const replicateApiUrl = ConfigurationManager.getConfig<string>('replicate.apiUrl', 'https://api.replicate.com/v1');
    const replicateApiToken = ConfigurationManager.getConfig<string>('replicate.apiToken', 'default_token');
    const replicateModelVersion = ConfigurationManager.getConfig<string>('replicate.modelVersion', 'default_version');
    const replicateWebhookUrl = ConfigurationManager.getConfig<string>('replicate.webhookUrl', 'https://example.com/webhook');

    const response = await axios.post(`${replicateApiUrl}/predictions`, {
        version: replicateModelVersion,
        webhook: replicateWebhookUrl,
        input: { image: imageUrl },
    }, {
        headers: {
            'Authorization': `Token ${replicateApiToken}`
        }
    });

    return response.data;
}
