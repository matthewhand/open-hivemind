const fs = require('fs');
const path = require('path');

const configFilePath = path.join(__dirname, '../config.json');
let config = {};

function loadConfig() {
    if (fs.existsSync(configFilePath)) {
        config = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
        console.log("Configuration loaded:", config); // Debugging line
    } else {
        console.error("Config file not found at", configFilePath);
        config = {
            // Default configuration structure if config file doesn't exist
            deciderConfig: {},
            discordSettings: {},
            enabledModules: {}
        };
    }
}

function saveConfig() {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
}

loadConfig();

module.exports = { config, loadConfig, saveConfig };
