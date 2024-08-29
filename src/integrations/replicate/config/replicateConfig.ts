import { getEnvConfig } from '@conf@config/configUtils';

class ReplicateConfig {
    public readonly REPLICATE_BASE_URL: string = getEnvConfig('REPLICATE_BASE_URL', 'replicate.apiUrl', 'https://api.replicate.com/v1');
    public readonly REPLICATE_API_TOKEN: string = getEnvConfig('REPLICATE_API_TOKEN', 'replicate.apiToken', 'default_replicate_api_token');
    public readonly REPLICATE_MODEL_VERSION: string = getEnvConfig('REPLICATE_MODEL_VERSION', 'replicate.modelVersion', 'default_version');
}

export default ReplicateConfig;
