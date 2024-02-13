const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Enhance the list of required environment variables with LLM parameters
const requiredEnvVars = [
    'CLIENT_ID', 
    'DISCORD_TOKEN', 
    'GUILD_ID',
];

class ConfigurationManager {
    constructor() {
        this.config = {};
        this.configFilePath = path.join(__dirname, 'config.json');
        this.loadConfig();
        this.applyEnvironmentVariables();
        if (process.env.LLM_BOT_DEBUG_MODE === 'true') {
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
                logger.error(`Error loading configuration from file: ${error}`);
            }
        } else {
            logger.warn('Configuration file not found. Using defaults and environment variables.');
        }
    }

    applyEnvironmentVariables() {
        // Apply all LLM_ prefixed environment variables dynamically
        Object.keys(process.env).forEach(key => {
            if (key.startsWith('LLM_')) {
                this.config[key] = process.env[key];
            }
        });

        // Apply other required environment variables
        requiredEnvVars.forEach(varName => {
            if (process.env[varName]) {
                this.config[varName] = process.env[varName];
            }
        });
    }

    validateConfig() {
        // Enhance validation to include optional checks for LLM_ prefixed variables if they are critical
        requiredEnvVars.forEach(varName => {
            if (!this.config[varName]) {
                logger.warn(`Required configuration ${varName} is missing.`);
            }
        });
    }

    getConfig(key) {
        // Provide a method to safely retrieve configuration values with optional default
        return this.config[key];
    }

    setConfig(key, value) {
        // Allow dynamic updates to the configuration
        this.config[key] = value;
        this.saveConfig();
    }

    saveConfig() {
        // Save updates back to the config file, if needed
        try {
            fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2));
            logger.info('Configuration saved to file successfully.');
        } catch (error) {
            logger.error(`Error saving configuration to file: ${error}`);
        }
    }

    debugEnvVars() {
        // Debugging helper to print out all environment variables used
        console.log('Environment Variables Debugging:');
        Object.keys(this.config).forEach(key => {
            console.log(`${key}: ${this.config[key]}`);
        });
    }
}

const configManager = new ConfigurationManager();
module.exports = configManager;
