import ConfigurationManager from '@config/ConfigurationManager';
const configManager = ConfigurationManager.getInstance();

export class perplexityConfig {
    public readonly PERPLEXITY_API_KEY: string = configManager.getEnvConfig('PERPLEXITY_API_KEY', 'llm.perplexity.apiKey', '');
    public readonly PERPLEXITY_MODEL: string = configManager.getEnvConfig('PERPLEXITY_MODEL', 'llm.perplexity.model', 'gpt3');
    public readonly PERPLEXITY_TIMEOUT: number = configManager.getEnvConfig('PERPLEXITY_TIMEOUT', 'llm.perplexity.timeout', 10000);
}
