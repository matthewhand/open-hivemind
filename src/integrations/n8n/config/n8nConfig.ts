const configManager = ConfigurationManager.getInstance();
import ConfigurationManager from '@config/ConfigurationManager';

class N8NConfig {
    public readonly N8N_API_URL: string = configManager.getEnvConfig('N8N_API_URL', 'llm.n8n.apiUrl', 'https://api.n8n.com');
    public readonly N8N_API_KEY: string = configManager.getEnvConfig('N8N_API_KEY', 'llm.n8n.apiKey', 'your-n8n-api-key');

    constructor() {
        console.log('N8NConfig initialized');
    }
}

export default N8NConfig;
