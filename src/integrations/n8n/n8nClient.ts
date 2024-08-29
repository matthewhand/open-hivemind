import ConfigurationManager from '@config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();

export class N8nClient {
    private readonly baseURL: string;
    private readonly apiKey: string;

    constructor() {
        this.baseURL = configManager.n8nConfig.N8N_API_BASE_URL;
        this.apiKey = configManager.N8N_API_KEY;
    }

    // Additional logic for N8nClient
}
