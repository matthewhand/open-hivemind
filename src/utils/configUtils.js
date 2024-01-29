const fs = require('fs');
const path = require('path');

const configFilePath = path.join(__dirname, 'config.json');
let config = {};

function loadConfig() {
    if (fs.existsSync(configFilePath)) {
        config = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
    } else {
        config = {
            channelHandlers: {},
            enabledModules: {} // Default empty if config file doesn't exist
        };
    }
}

function saveConfig() {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
}

loadConfig();

module.exports = { config, loadConfig, saveConfig };
