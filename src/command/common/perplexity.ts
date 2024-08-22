import axios from 'axios';
import ConfigurationManager from '@config/ConfigurationManager';
import logger from '@src/utils/logger';

const perplexityApiUrl = ConfigurationManager.getConfig<string>('perplexity.apiUrl');

export async function searchPerplexity(query: string): Promise<string> {
    try {
        const response = await axios.post(perplexityApiUrl, { query });
        return response.data.result;
    } catch (error) {
        logger.error(`Error performing Perplexity search: ${error}`);
        throw new Error('Failed to retrieve results from Perplexity.');
    }
}
