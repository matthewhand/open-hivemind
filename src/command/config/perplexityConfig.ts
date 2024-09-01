import config from 'config';

export default class PerplexityConfig {
    public readonly PERPLEXITY_API_URL: string;
    public readonly PERPLEXITY_API_KEY: string;

    constructor() {
        this.PERPLEXITY_API_URL = process.env.PERPLEXITY_API_URL || (config.has('perplexity.PERPLEXITY_API_URL') ? config.get<string>('perplexity.PERPLEXITY_API_URL') : 'https://api.perplexity.ai');
        this.PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || (config.has('perplexity.PERPLEXITY_API_KEY') ? config.get<string>('perplexity.PERPLEXITY_API_KEY') : 'your-perplexity-api-key');
        console.log('PerplexityConfig initialized');
    }
}
