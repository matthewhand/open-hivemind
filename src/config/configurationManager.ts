import fs from 'fs';
import path from 'path';
import logger from '../logging/logger';

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

    /**
     * Loads the configuration from a file if it exists.
     */
    private loadConfig(): void {
        if (fs.existsSync(this.configFilePath)) {
            try {
                const fileConfig = JSON.parse(fs.readFileSync(this.configFilePath, 'utf-8'));
                this.config = { ...this.config, ...fileConfig };
                logger.info('Configuration loaded from file.');
            } catch (error: any) {
                logger.error(`Error loading configuration from file: ${error}`);
            }
        } else {
            logger.warn('Configuration file not found. Using defaults and environment variables.');
        }
    }

    /**
     * Applies environment variables to the configuration.
     */
    private applyEnvironmentVariables(): void {
        requiredEnvVars.forEach(varName => {
            if (process.env[varName]) {
                this.config[varName] = process.env[varName];
            }
        });
    }

    /**
     * Validates that required configuration variables are set.
     */
    private validateConfig(): void {
        requiredEnvVars.forEach(varName => {
            if (!this.config[varName]) {
                logger.warn(`Required configuration ${varName} is missing.`);
            }
        });
    }

    /**
     * Retrieves a configuration value.
     * @param {string} key - The key of the configuration value to retrieve.
     * @returns {any} The configuration value.
     */
    public getConfig(key: string): any {
        return this.config[key];
    }

    /**
     * Sets a configuration value and saves it to the file.
     * @param {string} key - The key of the configuration value to set.
     * @param {any} value - The value to set.
     */
    public setConfig(key: string, value: any): void {
        this.config[key] = value;
        this.saveConfig();
    }

    /**
     * Saves the current configuration to a file.
     */
    private saveConfig(): void {
        try {
            fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2));
            logger.info('Configuration saved to file successfully.');
        } catch (error: any) {
            logger.error(`Error saving configuration to file: ${error}`);
        }
    }

    /**
     * Logs environment variables for debugging.
     */
    private debugEnvVars(): void {
        console.log('Environment Variables Debugging:');
        Object.keys(this.config).forEach(key => {
            console.log(key + ': ' + this.config[key]);
        });
    }
}

const configManager = new ConfigurationManager();
export default configManager;
