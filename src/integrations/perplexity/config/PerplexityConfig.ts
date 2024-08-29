import { getConfigOrWarn } from '@config/getConfigOrWarn';

export default class PerplexityConfig {
    public readonly PERPLEXITY_API_KEY: string = getConfigOrWarn('PERPLEXITY_API_KEY', '');
    public readonly PERPLEXITY_MODEL: string = getConfigOrWarn('PERPLEXITY_MODEL', 'gpt3');
    public readonly PERPLEXITY_TIMEOUT: number = getConfigOrWarn('PERPLEXITY_TIMEOUT', 10000);

    constructor() {
        if (!this.PERPLEXITY_API_KEY) {
            throw new Error('Missing critical Perplexity API Key configuration.');
        }
    }
}
