import { IConfig } from '../types/IConfig';

class PerplexityConfig implements IConfig {
    public readonly PERPLEXITY_API_URL: string = 'https://api.perplexity.ai';
    public readonly PERPLEXITY_API_KEY: string = 'your-perplexity-api-key';

    constructor() {
        console.log('PerplexityConfig initialized');
    }
}

export default PerplexityConfig;
