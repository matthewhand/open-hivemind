import Debug from "debug";
import ConfigurationManager from '@config/ConfigurationManager';
import axios from 'axios';

export async function replicateImageAnalysis(imageUrl: string): Promise<any> {
    const replicateApiUrl = ConfigurationManager.REPLICATE_BASE_URL;
    const replicateApiToken = ConfigurationManager.REPLICATE_API_TOKEN;
    const replicateModelVersion = ConfigurationManager.REPLICATE_MODEL_VERSION;
    const replicateWebhookUrl = ConfigurationManager.REPLICATE_WEBHOOK_URL;

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
