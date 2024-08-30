import { getEnvConfig } from '@config/configUtils';

class perplexityConfig {
    public readonly PERPLEXITY_API_URL: string = getEnvConfig('PERPLEXITY_API_URL', 'llm.perplexity.apiUrl', 'https://api.perplexity.com');
    public readonly PERPLEXITY_API_KEY: string = getEnvConfig('PERPLEXITY_API_KEY', 'llm.perplexity.apiKey', 'your-perplexity-api-key');

    constructor() {
        console.log('perplexityConfig initialized');
    }
}

export default perplexityConfig;
