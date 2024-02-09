const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger'); // Ensure this path matches your project structure

// List of required environment variables
const requiredEnvVars = ['CLIENT_ID', 'DISCORD_TOKEN', 'GUILD_ID'];

class ConfigurationManager {
    constructor() {
        this.config = {};
        this.configFilePath = path.join(__dirname, 'config.json');
        this.loadConfig();
        this.applyEnvironmentVariables();
        if (process.env.BOT_DEBUG_MODE === 'true') {
            this.debugEnvVars();
        }
        this.validateConfig();
    }

    loadConfig() {
        if (fs.existsSync(this.configFilePath)) {
            try {
                const fileConfig = JSON.parse(fs.readFileSync(this.configFilePath, 'utf-8'));
                this.config = { ...this.config, ...fileConfig };
                logger.info('Configuration loaded from file.');
            } catch (error) {
                logger.error(`Error loading configuration: ${error}`);
            }
        } else {
            logger.warn('Configuration file not found, using defaults.');
        }
    }

    applyEnvironmentVariables() {
        Object.keys(process.env).forEach(key => {
            if (Object.hasOwnProperty.call(this.config, key) || requiredEnvVars.includes(key)) {
                this.config[key] = process.env[key];
            }
        });
    }

    validateConfig() {
        requiredEnvVars.forEach(varName => {
            if (!this.config[varName]) {
                logger.warn(`${varName} configuration is missing.`);
                // process.exit(1);
            }
        });
    }

    getConfig(key) {
        return this.config[key];
    }

    setConfig(key, value) {
        this.config[key] = value;
        this.saveConfig();
    }

    saveConfig() {
        try {
            fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2));
            logger.info('Configuration saved successfully.');
        } catch (error) {
            logger.error(`Error saving configuration: ${error}`);
        }
    }

    debugEnvVars() {
        console.log('Debugging Environment Variables:');
        [...requiredEnvVars, ...Object.keys(this.config)].forEach(varName => {
            const value = this.config[varName];
            console.log(`${varName}: ${value}`);
        });
    }
}

const configManager = new ConfigurationManager();
module.exports = configManager;
