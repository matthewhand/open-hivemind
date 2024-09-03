import axios from 'axios';
import replicateConfig from '@integrations/replicate/config/replicateConfig';
import Debug from 'debug';

const debug = Debug('app:replicate');

/**
 * Calls the Replicate API to run a model prediction.
 *
 * This function interacts with the Replicate API using the provided model version and input data.
 * It handles the API request and processes the response or errors accordingly.
 *
 * Key Features:
 * - **API Integration**: Interacts with the Replicate API to run model predictions.
 * - **Error Handling**: Captures and logs errors during the API call.
 * - **Configuration**: Uses `replicateConfig` for API URL, key, and model version.
 */
export async function replicate(inputData: any): Promise<any> {
    try {
        const apiUrl = replicateConfig.get('REPLICATE_API_URL');
        const apiKey = replicateConfig.get('REPLICATE_API_KEY');
        const modelVersion = replicateConfig.get('REPLICATE_MODEL_VERSION');

        const response = await axios.post(`${apiUrl}/v1/predictions`, {
            version: modelVersion,
            input: inputData
        }, {
            headers: {
                Authorization: `Token ${apiKey}`
            }
        });

        return response.data;
    } catch (error: any) {
        debug(`Failed to call Replicate API: ${error.message}`);
        throw error;
    }
}
