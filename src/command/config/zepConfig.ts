import config from 'config';

export default class ZepConfig {
    public readonly ZEP_API_URL: string;
    public readonly ZEP_API_KEY: string;

    constructor() {
        this.ZEP_API_URL = process.env.ZEP_API_URL || (config.has('zep.ZEP_API_URL') ? config.get<string>('zep.ZEP_API_URL') : 'https://api.zep.com');
        this.ZEP_API_KEY = process.env.ZEP_API_KEY || (config.has('zep.ZEP_API_KEY') ? config.get<string>('zep.ZEP_API_KEY') : 'your-zep-api-key');
        console.log('ZepConfig initialized');
    }
}
