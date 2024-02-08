const fs = require('fs');
const path = require('path');

// Assuming constants.js primarily holds environment variable configurations
const constants = require('./constants');

const configFilePath = path.join(__dirname, '..', 'config', 'config.json');

let config = {};

// Load configurations from both config.json and environment variables
function loadConfig() {
    // Load static configurations
    if (fs.existsSync(configFilePath)) {
        const fileConfig = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
        // Merge file-based configurations with defaults or dynamic configs
        config = { ...fileConfig, ...constants };
    } else {
        console.warn(`Configuration file ${configFilePath} not found. Using defaults and environment variables.`);
        // Fallback or default configurations can be merged here if necessary
        config = { ...constants };
    }
}

// Optionally write current configurations back to config.json
// Useful if your application needs to update configurations at runtime
function saveConfig() {
    try {
        fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
        console.info('Configuration saved successfully.');
    } catch (error) {
        console.error(`Failed to save configuration: ${error.message}`);
    }
}

// Initially load configurations when this module is required
loadConfig();

module.exports = { config, saveConfig, loadConfig };
