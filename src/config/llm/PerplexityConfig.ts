import ConfigurationManager from '../ConfigurationManager';

class PerplexityConfig extends ConfigurationManager {
    public readonly PERPLEXITY_API_TOKEN: string = this.getEnvConfig('PERPLEXITY_API_TOKEN', 'perplexity.apiToken', 'your-perplexity-api-token-here');
    public readonly PERPLEXITY_MODEL: string = this.getEnvConfig('PERPLEXITY_MODEL', 'perplexity.model', 'sonar-huge');
}

export default PerplexityConfig;
