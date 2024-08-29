import ConfigurationManager from '@config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();

export class FlowiseClient {
    private readonly baseURL: string;
    private readonly apiKey: string;

    constructor() {
        this.baseURL = configManager.getConfig("flowise").FLOWISE_BASE_URL;
        this.apiKey = configManager.getConfig("flowise").FLOWISE_API_KEY;
    }

    // Additional logic and functionality
}
