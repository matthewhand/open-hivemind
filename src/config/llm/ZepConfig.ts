import ConfigurationManager from '../ConfigurationManager';

class ZepConfig extends ConfigurationManager {
    public readonly ZEP_API_URL: string = this.getEnvConfig('ZEP_API_URL', 'llm.zep.apiUrl', 'https://api.zep.com');
}

export default ZepConfig;
