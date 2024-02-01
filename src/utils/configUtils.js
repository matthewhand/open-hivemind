// In your configUtils.js or a similar configuration file
const fs = require('fs');
const path = require('path');
const { v4: uuidv4, validate: uuidValidate } = require('uuid'); // Corrected import

const configFilePath = path.join(__dirname, 'config.json');
let config = {};

function loadConfig() {
    if (fs.existsSync(configFilePath)) {
        config = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
    } else {
        config = { guildHandlers: {} }; // Default structure
    }

    // Check for user_id in environment variable and validate it
    if (process.env.USER_ID && uuidv4.isUuid(process.env.USER_ID)) {
        config.userId = process.env.USER_ID;
    } else {
        // Generate a new UUID if not valid or not present
        config.userId = config.userId || uuidv4();
        saveConfig(); // Save the newly generated UUID
    }
}

function saveConfig() {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
}

loadConfig();

module.exports = { config, saveConfig };