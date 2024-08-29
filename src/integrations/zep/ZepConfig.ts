import { getEnvConfig } from '@config/configUtils';

class ZepConfig {
    public readonly ZEP_API_URL: string = getEnvConfig('ZEP_API_URL', 'llm.zep.apiUrl', 'https://api.zep.com');
    public readonly ZEP_API_KEY: string = getEnvConfig('ZEP_API_KEY', 'llm.zep.apiKey', 'your-zep-api-key');

    constructor() {
        console.log('ZepConfig initialized');
    }
}

export default ZepConfig;
