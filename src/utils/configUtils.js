// In your configUtils.js or a similar configuration file
const fs = require('fs');
const path = require('path');
// const { v4: uuidv4, validate: uuidValidate } = require('uuid'); // Commented out for now

const configFilePath = path.join(__dirname, 'config.json');
let config = {};

function loadConfig() {
    if (fs.existsSync(configFilePath)) {
        config = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
    } else {
        config = { guildHandlers: {} }; // Default structure
    }

    // Use a hardcoded dummy UUID for now
    config.userId = config.userId || "123e4567-e89b-12d3-a456-426614174000"; // Dummy UUID
    saveConfig(); // Save the UUID
}

function saveConfig() {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
}

loadConfig();

module.exports = { config, saveConfig };
