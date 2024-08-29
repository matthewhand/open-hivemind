import { IConfig } from '../types/IConfig';

class QuivrConfig implements IConfig {
    public readonly QUIVR_API_URL: string = 'https://api.quivr.com';
    public readonly QUIVR_API_KEY: string = 'your-quivr-api-key';

    constructor() {
        console.log('QuivrConfig initialized');
    }
}

export default QuivrConfig;
