function redactValue(value) {
    if (value.length <= 4) {
        return '*'.repeat(value.length);
    }
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
}

function debugEnvVars() {
    const requiredEnvVars = [
        'CLIENT_ID',
        'DISCORD_TOKEN',
        'GUILD_ID'
    ];

    const optionalEnvVars = [
        'CHANNEL_ID', 'BOT_ALLOWED_USERS', 'BOT_ALLOWED_ROLES', 'BOT_DEBUG_MODE',
        'LLM_API_KEY', 'LLM_ENDPOINT_URL', 'LLM_SYSTEM_PROMPT',
        'PERPLEXITY_API_KEY', 'PERPLEXITY_URL', 'PERPLEXITY_MODEL', 'PERPLEXITY_SYSTEM_PROMPT',
        'QUIVR_API_KEY', 'QUIVR_URL',
        'FLOWISE_API_BASE_URL', 'FLOWISE_ACTIONS', 
        'REPLICATE_MODEL_VERSION', 'REPLICATE_DEFAULT_PROMPT', 'REPLICATE_TOKEN',
        'REPLICATE_WEBHOOK_URL', 'WEB_SERVER_PORT'
    ];

    // Dynamically add FLOWISE_<action>_ID based on FLOWISE_ACTIONS
    const flowiseActions = process.env.FLOWISE_ACTIONS ? process.env.FLOWISE_ACTIONS.split(',') : [];
    flowiseActions.forEach(action => {
        optionalEnvVars.push(`FLOWISE_${action.toUpperCase()}_ID`);
    });

    const redactSuffixes = ['_TOKEN', '_KEY']; // Adjust these suffixes as needed

    if (process.env.BOT_DEBUG_MODE && process.env.BOT_DEBUG_MODE.toLowerCase() === 'true') {
        console.log('Debugging Environment Variables:');
        [...requiredEnvVars, ...optionalEnvVars].forEach(varName => {
            let value = process.env[varName];
            if (redactSuffixes.some(suffix => varName.endsWith(suffix))) {
                value = redactValue(value);
            }
            console.log(`${varName}: ${value || 'Not Set'}`);
        });
    }

    const unsetRequiredVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (unsetRequiredVars.length > 0) {
        console.error(`The following required environment variables are not set: ${unsetRequiredVars.join(', ')}`);
        process.exit(1);
    }
}

module.exports = { debugEnvVars };

