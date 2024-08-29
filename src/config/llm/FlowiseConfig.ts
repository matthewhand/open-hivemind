import { getEnvConfig } from '../configUtils';

class FlowiseConfig {
    public readonly FLOWISE_API_URL: string = getEnvConfig('FLOWISE_API_URL', 'llm.flowise.apiUrl', 'https://api.flowise.com');
    public readonly FLOWISE_API_KEY: string = getEnvConfig('FLOWISE_API_KEY', 'llm.flowise.apiKey', 'your-flowise-api-key');

    constructor() {
        console.log('FlowiseConfig initialized');
    }
}

export default FlowiseConfig;
