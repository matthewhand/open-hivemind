import ConfigurationManager from '../ConfigurationManager';

class PerplexityConfig {
    private configManager = ConfigurationManager.getInstance();
    public readonly PERPLEXITY_API_URL: string = this.configManager.getConfig('llm.perplexity.apiUrl', 'https://api.perplexity.ai');
    public readonly PERPLEXITY_API_KEY: string = this.configManager.getConfig('llm.perplexity.apiKey', 'your-perplexity-api-key');

    constructor() {
        console.log('PerplexityConfig initialized');
    }
}

export default PerplexityConfig;
