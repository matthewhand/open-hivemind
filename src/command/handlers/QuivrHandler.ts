import QuivrConfig from '../../integrations/quivr/config/QuivrConfig';

export default class QuivrHandler {
    private config: typeof QuivrConfig;

    constructor() {
        this.config = QuivrConfig;
        console.log('QuivrHandler initialized with API URL:', this.config.get('QUIVR_API_URL'));
    }

    handleCommand(command: string) {
        const apiUrl = this.config.get('QUIVR_API_URL');
        if (apiUrl) {
            console.log(`Handling command with Quivr API URL: ${apiUrl}`);
            // Implement HTTP request to Quivr API here using apiUrl
        } else {
            console.error('Quivr API URL is not configured');
        }
    }
}
