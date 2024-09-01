import config from 'config';

export default class QuivrConfig {
    public readonly QUIVR_API_URL: string;
    public readonly QUIVR_API_KEY: string;

    constructor() {
        this.QUIVR_API_URL = process.env.QUIVR_API_URL || (config.has('quivr.QUIVR_API_URL') ? config.get<string>('quivr.QUIVR_API_URL') : 'https://api.quivr.com');
        this.QUIVR_API_KEY = process.env.QUIVR_API_KEY || (config.has('quivr.QUIVR_API_KEY') ? config.get<string>('quivr.QUIVR_API_KEY') : 'your-quivr-api-key');
        console.log('QuivrConfig initialized');
    }
}
