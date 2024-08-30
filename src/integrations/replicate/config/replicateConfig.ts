import ConfigurationManager from '@config/ConfigurationManager';
const configManager = ConfigurationManager.getInstance();

class ReplicateConfig {
    public readonly REPLICATE_API_URL: string = configManager.getEnvConfig('REPLICATE_API_URL', 'llm.replicate.apiUrl', 'https://api.replicate.com');
    public readonly REPLICATE_API_KEY: string = configManager.getEnvConfig('REPLICATE_API_KEY', 'llm.replicate.apiKey', 'your-replicate-api-key');

    constructor() {
        console.log('ReplicateConfig initialized');
    }
}

export default ReplicateConfig;
