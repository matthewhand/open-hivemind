function debugEnvVars() {
    const requiredEnvVars = [
        'CLIENT_ID',
        'DISCORD_TOKEN',
        'GUILD_ID',
        'ALLOWED_USERS',
        'LLM_URL',
        'LLM_SYSTEM',
        'LLM_API_KEY',
        'PORT'
    ];
    if (process.env.DEBUG && process.env.DEBUG.toLowerCase() === 'true') {
        console.log('Debugging Environment Variables:');
        requiredEnvVars.forEach(varName => {
            console.log(`${varName}: ${process.env[varName] || 'Not Set'}`);
        });
    }
    const unsetVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (unsetVars.length > 0) {
        console.error(`The following environment variables are not set: ${unsetVars.join(', ')}`);
        process.exit(1);
    }
}

module.exports = { debugEnvVars };
