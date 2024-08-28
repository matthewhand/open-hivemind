import ConfigurationManager from '@config/ConfigurationManager';

const configManager = new ConfigurationManager();

export class N8nClient {
    private readonly baseURL: string;
    private readonly apiKey: string;

    constructor() {
        this.baseURL = configManager.N8N_API_BASE_URL || 'http://localhost:5678/api/v1';
        this.apiKey = configManager.N8N_API_KEY || '';
    }

    // Further methods and logic for N8nClient
}
