import ZepConfig from '../../integrations/zep/config/ZepConfig';

export default class ZepHandler {
    private config: typeof ZepConfig;

    constructor() {
        this.config = ZepConfig;
        console.log('ZepHandler initialized with API URL:', this.config.get('ZEP_API_URL'));
    }

    handleCommand(command: string) {
        const apiUrl = this.config.get('ZEP_API_URL');
        if (apiUrl) {
            console.log(`Handling command with Zep API URL: ${apiUrl}`);
            // Implement HTTP request to Zep API here using apiUrl
        } else {
            console.error('Zep API URL is not configured');
        }
    }
}
