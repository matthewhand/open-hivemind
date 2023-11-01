function debugEnvVars() {
    const requiredEnvVars = [
        'CLIENT_ID',
        'DISCORD_TOKEN',
        'GUILD_ID',
        'ALLOWED_USERS',
        'LLM_URL',
        'LLM_SYSTEM',
        'LLM_API_KEY',
        'PORT',
        'CHANNEL_ID',
        'REPLICATE_API_TOKEN',
        'ALLOWED_ROLES',
        'LLM_MODEL',
        'MODEL_VERSION',
        'IMAGE_PROMPT',
        'WEBHOOK_URL'
    ];

    const optionalEnvVars = [
        'MODEL_VERSION',  // It's optional, fallback value exists in the code
        'IMAGE_PROMPT',  // It's optional, fallback value exists in the code
        'LLM_MODEL'  // It's optional, fallback value exists in the code
    ];

    if (process.env.DEBUG && process.env.DEBUG.toLowerCase() === 'true') {
        console.log('Debugging Environment Variables:');
        requiredEnvVars.forEach(varName => {
            console.log(`${varName}: ${process.env[varName] || 'Not Set'}`);
        });
    }

    const unsetVars = requiredEnvVars.filter(varName => !process.env[varName]);
    const unsetRequiredVars = unsetVars.filter(varName => !optionalEnvVars.includes(varName));

    if (unsetRequiredVars.length > 0) {
        console.error(`The following environment variables are not set: ${unsetRequiredVars.join(', ')}`);
        process.exit(1);
    }
}

module.exports = { debugEnvVars };
