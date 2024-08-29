import { getEnvConfig } from '@config/configUtils';

class ReplicateConfig {
    public readonly REPLICATE_API_URL: string = getEnvConfig('REPLICATE_API_URL', 'llm.replicate.apiUrl', 'https://api.replicate.com');
    public readonly REPLICATE_API_KEY: string = getEnvConfig('REPLICATE_API_KEY', 'llm.replicate.apiKey', 'your-replicate-api-key');

    constructor() {
        console.log('ReplicateConfig initialized');
    }
}

export default ReplicateConfig;
