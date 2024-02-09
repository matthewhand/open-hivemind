const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger'); // Ensure this path is correct based on your project structure

// Define your required environment variables
const requiredEnvVars = ['CLIENT_ID', 'DISCORD_TOKEN', 'GUILD_ID'];

function redactValue(value) {
    if (!value) {
        return 'Not Set';
    }
    if (value.length <= 4) {
        return '*'.repeat(value.length);
    }
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
}

function debugEnvVars() {
    const envSamplePath = path.join(__dirname, '..', '.env.sample');
    let allEnvVars = [];

    if (fs.existsSync(envSamplePath)) {
        const envSampleContent = fs.readFileSync(envSamplePath, 'utf8');
        allEnvVars = envSampleContent.split('\n').map(line => line.split('=')[0]).filter(Boolean);
    }

    const optionalEnvVars = allEnvVars.filter(varName => !requiredEnvVars.includes(varName));

    if (process.env.BOT_DEBUG_MODE && process.env.BOT_DEBUG_MODE.toLowerCase() === 'true') {
        console.log('Debugging Environment Variables:');
        [...requiredEnvVars, ...optionalEnvVars].forEach(varName => {
            const value = process.env[varName];
            const isSensitive = varName.endsWith('_TOKEN') || varName.endsWith('_KEY');
            const redactedValue = isSensitive ? redactValue(value) : value;
            console.log(`${varName}: ${redactedValue}`);
        });
    }

    const unsetRequiredVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (unsetRequiredVars.length > 0) {
        console.error(`The following required environment variables are not set: ${unsetRequiredVars.join(', ')}`);
        process.exit(1);
    }
}

class ConfigurationManager {
    constructor() {
        this.config = {};
        this.configFilePath = path.join(__dirname, 'config.json');
        this.loadConfig();
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

        this.applyEnvironmentVariables();
        this.validateConfig();
    }

    applyEnvironmentVariables() {
        // Example: Override file config with environment variables
        this.config.BOT_TO_BOT_MODE = process.env.BOT_TO_BOT_MODE || this.config.BOT_TO_BOT_MODE;
        // Add other overrides as necessary
    }

    validateConfig() {
        // Example validation
        if (!this.config.BOT_TO_BOT_MODE) {
            logger.error('BOT_TO_BOT_MODE configuration is missing.');
            process.exit(1);
        }
        // Validate other configurations as necessary
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
}

const configManager = new ConfigurationManager();
module.exports = configManager;
