import fs from 'fs';
import path from 'path';
import logger from '@utils/logger';

const requiredEnvVars = ['CLIENT_ID', 'DISCORD_TOKEN', 'GUILD_ID'];

class ConfigurationManager {
    private config: Record<string, any> = {};
    private configFilePath: string;

    constructor() {
        this.configFilePath = path.join(__dirname, 'config.json');
        this.loadConfig();
        this.applyEnvironmentVariables();
        if (process.env.LLM_BOT_DEBUG_MODE === 'true') {
            this.debugEnvVars();
        }
        this.validateConfig();
    }

    private loadConfig(): void {
        if (fs.existsSync(this.configFilePath)) {
            try {
                const fileConfig = JSON.parse(fs.readFileSync(this.configFilePath, 'utf-8'));
                this.config = { ...this.config, ...fileConfig };
                logger.info('Configuration loaded from file.');
            } catch (error) {
                logger.error('Error loading configuration from file: ' + error);
            }
        } else {
            logger.warn('Configuration file not found. Using defaults and environment variables.');
        }
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
                logger.warn('Required configuration ' + varName + ' is missing.');
            }
        });
    }

    public getConfig(key: string): any {
        return this.config[key];
    }

    public setConfig(key: string, value: any): void {
        this.config[key] = value;
        this.saveConfig();
    }

    private saveConfig(): void {
        try {
            fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2));
            logger.info('Configuration saved to file successfully.');
        } catch (error) {
            logger.error('Error saving configuration to file: ' + error);
        }
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
