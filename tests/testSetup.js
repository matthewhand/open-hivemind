const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Define the path to your .env.development.local file
const envFilePath = path.join(__dirname, '..', '.env.development.local');

// Check if the .env.development.local file exists
if (fs.existsSync(envFilePath)) {
    dotenv.config({ path: envFilePath });
    console.info('.env.development.local found and loaded for tests.');
} else {
    console.warn('.env.development.local file not found. Some tests may be skipped.');
}

// Optionally, you can define critical environment variables that must be set for the tests to run
const requiredEnvVars = ['LLM_API_KEY', 'LLM_ENDPOINT_URL']; // Example critical environment variables

// Function to check if all required environment variables are set
const areRequiredEnvVarsSet = requiredEnvVars.every(varName => process.env[varName]);

if (!areRequiredEnvVarsSet) {
    console.warn('One or more critical environment variables are missing. Some tests may be skipped.');
}

// Export a flag to indicate if the tests should run based on the environment setup
module.exports = {
    shouldTestsRun: fs.existsSync(envFilePath) && areRequiredEnvVarsSet,
};
