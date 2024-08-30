const configManager = ConfigurationManager.getInstance();
import ConfigurationManager from '@config/ConfigurationManager';

class QuivrConfig {
    public readonly QUIVR_API_URL: string = configManager.getEnvConfig('QUIVR_API_URL', 'llm.quivr.apiUrl', 'https://api.quivr.com');
    public readonly QUIVR_API_KEY: string = configManager.getEnvConfig('QUIVR_API_KEY', 'llm.quivr.apiKey', 'your-quivr-api-key');

    constructor() {
        console.log('QuivrConfig initialized');
    }
}

export default QuivrConfig;
