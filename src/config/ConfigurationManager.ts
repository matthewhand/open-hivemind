import config from 'config';
import Debug from 'debug';

const debug = Debug('app:ConfigurationManager');

class ConfigurationManager {
    constructor() {
        debug('Loading core configurations...');
    }

    protected getEnvConfig<T>(envVar: string, configKey: string, fallbackValue: T): T {
        const envValue = process.env[envVar];
        if (envValue !== undefined) {
            if (typeof fallbackValue === 'boolean') {
                return (envValue.toLowerCase() === 'true') as unknown as T;
            } else if (typeof fallbackValue === 'number') {
                const parsedValue = parseFloat(envValue);
                return isNaN(parsedValue) ? fallbackValue : (parsedValue as unknown as T);
            }
            return envValue as unknown as T;
        }

        try {
            const configValue = config.get(configKey);
            return configValue !== undefined ? (configValue as T) : fallbackValue;
        } catch (e) {
            debug(`Error fetching CONFIG [${configKey}]. Using fallback value: ${fallbackValue}`);
            return fallbackValue;
        }
    }

    /**
     * Dynamically loads the command handler based on the provider category (search/execution).
     */
    public loadCommandHandlers() {
        const commandProviders = this.getEnvConfig<{ search: string[], execution: string[] }>('COMMAND_PROVIDERS', 'commands.commandProvider', { search: [], execution: [] });
        const handlers = {
            search: commandProviders.search.map(provider => this.loadCommandHandler(provider)),
            execution: commandProviders.execution.map(provider => this.loadCommandHandler(provider))
        };
        return handlers;
    }

    /**
     * Loads a command handler for a specific provider.
     */
    private loadCommandHandler(provider: string) {
        const handlerPath = `./commands/${provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase()}Handler`;
        try {
            const HandlerClass = require(handlerPath).default;
            return new HandlerClass();
        } catch (error) {
            throw new Error(`Unsupported or missing command provider: ${provider}. Could not load ${handlerPath}.`);
        }
    }

    /**
     * Dynamically loads the LLM configuration based on the provider.
     */
    public loadLLMConfig(provider: string) {
        switch (provider.toLowerCase()) {
            case 'openai':
                return new (require('./llm/OpenAIConfig').default)();
            case 'replicate':
                return new (require('./llm/ReplicateConfig').default)();
            case 'perplexity':
                return new (require('./llm/PerplexityConfig').default)();
            case 'n8n':
                return new (require('./llm/N8NConfig').default)();
            case 'flowise':
                return new (require('./llm/FlowiseConfig').default)();
            default:
                throw new Error(`Unsupported LLM provider: ${provider}`);
        }
    }

    /**
     * Dynamically loads service configurations.
     */
    public loadServiceConfig(service: string) {
        switch (service.toLowerCase()) {
            case 'webhook':
                return new (require('./service/WebhookConfig').default)();
            default:
                throw new Error(`Unsupported service: ${service}`);
        }
    }
}

export default ConfigurationManager;
