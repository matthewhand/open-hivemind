import { getConfigOrWarn } from '@common/config/configUtils';

class FlowiseConfig {
    public readonly FLOWISE_API_URL: string = getConfigOrWarn('FLOWISE_API_URL', 'https://api.flowise.com');
    public readonly FLOWISE_API_KEY: string = getConfigOrWarn('FLOWISE_API_KEY', 'your-flowise-api-key');

    constructor() {
        // Validate essential configurations
        if (!this.FLOWISE_API_URL || !this.FLOWISE_API_KEY) {
            throw new Error('Missing critical Flowise configuration. Please check your environment variables or config files.');
        }
        console.log('FlowiseConfig initialized');
    }
}

export default FlowiseConfig;
