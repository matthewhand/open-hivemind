// configUtils.js
const fs = require('fs');
const path = require('path');

const configFilePath = path.join(__dirname, 'config.json');
let rawConfig = {};

if (fs.existsSync(configFilePath)) {
    rawConfig = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
} else {
    rawConfig = { guildHandlers: {} }; // Default structure
}

const handler = {
    set(target, key, value) {
        target[key] = value;
        // Automatically update config.json whenever a change is made
        fs.writeFileSync(configFilePath, JSON.stringify(rawConfig, null, 2), 'utf-8');
        return true;
    }
};

const config = new Proxy(rawConfig, handler);

module.exports = { config };
