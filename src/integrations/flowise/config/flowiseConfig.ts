import ConfigurationManager from '@config/ConfigurationManager';
const configManager = ConfigurationManager.getInstance();

class FlowiseConfig {
    public readonly FLOWISE_API_URL: string = configManager.getEnvConfig('FLOWISE_API_URL', 'llm.flowise.apiUrl', 'https://api.flowise.com');
    public readonly FLOWISE_API_KEY: string = configManager.getEnvConfig('FLOWISE_API_KEY', 'llm.flowise.apiKey', 'your-flowise-api-key');

    constructor() {
        // Validate essential configurations
        if (!this.FLOWISE_API_URL || !this.FLOWISE_API_KEY) {
            throw new Error('Missing critical Flowise configuration. Please check your environment variables or config files.');
        }
        console.log('FlowiseConfig initialized');
    }
}

export default FlowiseConfig;
