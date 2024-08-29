import ConfigurationManager from '@common/config/ConfigurationManager';

const configManager = new ConfigurationManager();

export class FlowiseClient {
    private readonly baseURL: string;
    private readonly apiKey: string;

    constructor() {
        this.baseURL = configManager.FLOWISE_BASE_URL;
        this.apiKey = configManager.FLOWISE_API_KEY;
    }

    // Additional logic and functionality
}
