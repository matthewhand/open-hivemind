import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { getConfigOrWarn } from './getConfigOrWarn';

const debug = Debug('app:ConfigurationManager');

class ConfigurationManager {
    private static instance: ConfigurationManager;
    private configs: Map<string, any> = new Map();

    public readonly LLM_PROVIDER: string = getConfigOrWarn('LLM_PROVIDER', 'llm.provider', 'openai');
    public readonly MESSAGE_PROVIDER: string = getConfigOrWarn('MESSAGE_PROVIDER', 'message.provider', 'discord');
    public readonly SERVICE_WEBHOOK_URL: string = getConfigOrWarn('SERVICE_WEBHOOK_URL', 'service.webhook.url', 'https://example.com/webhook');
    public readonly WEBHOOK_URL: string = getConfigOrWarn('WEBHOOK_URL', 'service.webhook.url', 'https://your-webhook-url');

    private constructor() {
        this.loadConfigurations();
    }

    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }

    private loadConfigurations() {
        const configDir = path.join(__dirname, 'integrations'); // Adjust this path as necessary
        const files = fs.readdirSync(configDir);

        for (const file of files) {
            const fullPath = path.join(configDir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                const configFile = path.join(fullPath, 'config', `${path.basename(fullPath)}Config.ts`);
                if (fs.existsSync(configFile)) {
                    import(configFile).then((module) => {
                        const configInstance = new module.default();
                        this.configs.set(path.basename(fullPath), configInstance);
                    }).catch((error) => {
                        debug(`Error loading configuration from ${configFile}: ${error.message}`);
                    });
                }
            }
        }
    }

    public getConfig(name: string) {
        return this.configs.get(name);
    }
}

export default ConfigurationManager;
