import { getConfigOrWarn } from '@common/config/getConfigOrWarn';

class PerplexityConfig {
    public readonly PERPLEXITY_API_TOKEN: string = getConfigOrWarn('PERPLEXITY_API_TOKEN', 'llm.perplexity.apiToken', 'your-perplexity-api-token');
    public readonly PERPLEXITY_MODEL: string = getConfigOrWarn('PERPLEXITY_MODEL', 'llm.perplexity.model', 'sonar-huge');

    constructor() {
        // Validate essential configurations
        if (!this.PERPLEXITY_API_TOKEN || !this.PERPLEXITY_MODEL) {
            throw new Error('Missing critical Perplexity configuration. Please check your environment variables or config files.');
        }
        console.log('PerplexityConfig initialized');
    }
}

export default PerplexityConfig;
