import ConfigurationManager from '../ConfigurationManager';

class N8NConfig extends ConfigurationManager {
    public readonly N8N_API_BASE_URL: string = this.getEnvConfig('N8N_API_BASE_URL', 'n8n.apiBaseUrl', 'http://localhost:5678/api/v1');
    public readonly N8N_API_KEY: string = this.getEnvConfig('N8N_API_KEY', 'n8n.apiKey', 'default-n8n-api-key');
}

export default N8NConfig;
