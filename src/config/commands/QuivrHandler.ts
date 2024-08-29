import QuivrConfig from '../llm/QuivrConfig';

export default class QuivrHandler {
    private config: QuivrConfig;

    constructor() {
        this.config = new QuivrConfig();
        console.log('QuivrHandler initialized with API URL:', this.config.QUIVR_API_URL);
    }

    handleCommand(command: string) {
        console.log(`Handling command with Quivr: ${command}`);
        // Implement HTTP request to Quivr API here using this.config.QUIVR_API_URL
    }
}
