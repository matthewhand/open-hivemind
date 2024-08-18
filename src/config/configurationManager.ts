import config from 'config';
import logger from '../utils/logger';

const requiredEnvVars = ['CLIENT_ID', 'DISCORD_TOKEN', 'GUILD_ID'];

class ConfigurationManager {
    private config: Record<string, any>;

    constructor() {
        this.config = config;
        this.applyEnvironmentVariables();
        if (process.env.LLM_BOT_DEBUG_MODE === 'true') {
            this.debugEnvVars();
        }
        this.validateConfig();
    }

    private applyEnvironmentVariables(): void {
        requiredEnvVars.forEach(varName => {
            if (process.env[varName]) {
                this.config[varName] = process.env[varName];
            }
        });
    }

    private validateConfig(): void {
        requiredEnvVars.forEach(varName => {
            if (!this.config[varName]) {
                logger.warn(`Required configuration ${varName} is missing.`);
            }
        });
    }

    public getConfig(key: string): any {
        return this.config[key];
    }

    private debugEnvVars(): void {
        console.log('Environment Variables Debugging:');
        Object.keys(this.config).forEach(key => {
            console.log(key + ': ' + this.config[key]);
        });
    }
}

const configManager = new ConfigurationManager();
export default configManager;
