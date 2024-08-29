import ConfigurationManager from '../ConfigurationManager';

class QuivrConfig extends ConfigurationManager {
    public readonly QUIVR_API_URL: string = this.getEnvConfig('QUIVR_API_URL', 'llm.quivr.apiUrl', 'https://api.quivr.com');
}

export default QuivrConfig;
