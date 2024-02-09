// src/config/config.js
const fs = require('fs');
const path = require('path');
const { debugEnvVars } = require('./debugEnvVars'); // Assuming debugEnvVars is moved or accessible here

const configFilePath = path.join(__dirname, 'config.json');
let config = {};

function validateConfig(loadedConfig) {
    const requiredConfigs = ['CLIENT_ID', 'DISCORD_TOKEN', 'GUILD_ID'];
    let missingConfigs = [];

    requiredConfigs.forEach(key => {
        if (!loadedConfig[key]) {
            missingConfigs.push(key);
        }
    });

    if (missingConfigs.length > 0) {
        console.error(`Missing required configurations: ${missingConfigs.join(', ')}`);
        process.exit(1);
    }

    // Additional validation logic for optional configurations or specific formats can be added here
}

function loadConfig() {
    if (fs.existsSync(configFilePath)) {
        config = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
    } else {
        console.warn(`Configuration file ${configFilePath} not found. Using defaults.`);
    }

    // Apply environment variables to override file configurations or fill in missing values
    config = { ...config, ...process.env };

    // Validate loaded configurations
    validateConfig(config);

    // Debugging and redacting sensitive information
    debugEnvVars();
}

loadConfig();

module.exports = { config };
