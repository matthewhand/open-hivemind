const configManager = ConfigurationManager.getInstance();
import ConfigurationManager from '@config/ConfigurationManager';

class perplexityConfig {
    public readonly PERPLEXITY_API_URL: string = configManager.getEnvConfig('PERPLEXITY_API_URL', 'llm.perplexity.apiUrl', 'https://api.perplexity.com');
    public readonly PERPLEXITY_API_KEY: string = configManager.getEnvConfig('PERPLEXITY_API_KEY', 'llm.perplexity.apiKey', 'your-perplexity-api-key');

    constructor() {
        console.log('perplexityConfig initialized');
    }
}

export default perplexityConfig;
