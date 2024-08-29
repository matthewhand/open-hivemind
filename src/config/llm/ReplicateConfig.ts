import ConfigurationManager from '../ConfigurationManager';

class ReplicateConfig extends ConfigurationManager {
    public readonly REPLICATE_API_TOKEN: string = this.getEnvConfig('REPLICATE_API_TOKEN', 'replicate.apiToken', 'default_replicate_api_token');
    public readonly REPLICATE_BASE_URL: string = this.getEnvConfig('REPLICATE_BASE_URL', 'replicate.apiUrl', 'https://api.replicate.com/v1');
    public readonly REPLICATE_MODEL_VERSION: string = this.getEnvConfig('REPLICATE_MODEL_VERSION', 'replicate.modelVersion', 'default_version');
}

export default ReplicateConfig;
