import ConfigurationManager from '../ConfigurationManager';

class FlowiseConfig extends ConfigurationManager {
    public readonly FLOWISE_BASE_URL: string = this.getEnvConfig('FLOWISE_BASE_URL', 'flowise.apiBaseUrl', 'http://localhost:3000/api/v1');
    public readonly FLOWISE_API_KEY: string = this.getEnvConfig('FLOWISE_API_KEY', 'flowise.apiKey', 'default-flowise-api-key');
}

export default FlowiseConfig;
