import ConfigurationManager from '../ConfigurationManager';

class N8NConfig {
    private configManager = ConfigurationManager.getInstance()();
    public readonly N8N_API_URL: string = this.configManager.getEnvConfig('N8N_API_URL', 'llm.n8n.apiUrl', 'https://api.n8n.io');
    public readonly N8N_API_KEY: string = this.configManager.getEnvConfig('N8N_API_KEY', 'llm.n8n.apiKey', 'your-n8n-api-key');

    constructor() {
        console.log('N8NConfig initialized');
    }
}

export default N8NConfig;
