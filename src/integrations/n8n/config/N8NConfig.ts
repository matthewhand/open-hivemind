import { getConfigOrWarn } from '@common/config/getConfigOrWarn';

class N8NConfig {
    public readonly N8N_API_KEY: string = getConfigOrWarn('N8N_API_KEY', 'llm.n8n.apiKey', 'default-n8n-api-key');
    public readonly N8N_API_BASE_URL: string = getConfigOrWarn('N8N_API_BASE_URL', 'llm.n8n.apiBaseUrl', 'http://localhost:5678/api/v1');

    constructor() {
        // Validate essential configurations
        if (!this.N8N_API_KEY || !this.N8N_API_BASE_URL) {
            throw new Error('Missing critical N8N configuration. Please check your environment variables or config files.');
        }
        console.log('N8NConfig initialized');
    }
}

export default N8NConfig;
