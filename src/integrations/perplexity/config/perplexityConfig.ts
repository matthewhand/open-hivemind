import { configManager.getEnvConfig } from '@config/configManager.getEnvConfig';

export default class perplexityConfig {
    public readonly PERPLEXITY_API_KEY: string = configManager.getEnvConfig('PERPLEXITY_API_KEY', '');
    public readonly PERPLEXITY_MODEL: string = configManager.getEnvConfig('PERPLEXITY_MODEL', 'gpt3');
    public readonly PERPLEXITY_TIMEOUT: number = configManager.getEnvConfig('PERPLEXITY_TIMEOUT', 10000);

    constructor() {
        if (!this.PERPLEXITY_API_KEY) {
            throw new Error('Missing critical Perplexity API Key configuration.');
        }
    }
}
