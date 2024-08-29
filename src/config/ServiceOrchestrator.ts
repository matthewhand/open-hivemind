import config from 'config';

class ServiceOrchestrator {
    private llmProvider: string;
    private messageProvider: string;
    private commandProvider: string;

    constructor() {
        this.llmProvider = config.get<string>('service.LLM_PROVIDER');
        this.messageProvider = config.get<string>('service.MESSAGE_PROVIDER');
        this.commandProvider = config.get<string>('service.COMMAND_PROVIDER');
    }

    public setupConnections() {
        const llmToMessage = config.get<{ [key: string]: string }>('connections.llm_to_message');
        const commandToLlm = config.get<{ [key: string]: string }>('connections.command_to_llm');

        if (llmToMessage[this.llmProvider] === this.messageProvider) {
            console.log(`Connecting LLM provider ${this.llmProvider} to Message provider ${this.messageProvider}`);
        }

        if (commandToLlm[this.commandProvider] === this.llmProvider) {
            console.log(`Connecting Command provider ${this.commandProvider} to LLM provider ${this.llmProvider}`);
        }
    }
}

export default ServiceOrchestrator;
