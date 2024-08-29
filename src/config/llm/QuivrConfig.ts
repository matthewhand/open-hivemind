import { getEnvConfig } from '../configUtils';

class QuivrConfig {
    public readonly QUIVR_API_URL: string = getEnvConfig('QUIVR_API_URL', 'llm.quivr.apiUrl', 'https://api.quivr.com');
    public readonly QUIVR_API_KEY: string = getEnvConfig('QUIVR_API_KEY', 'llm.quivr.apiKey', 'your-quivr-api-key');

    constructor() {
        console.log('QuivrConfig initialized');
    }
}

export default QuivrConfig;
