import Debug from 'debug';

const debug = Debug('app:utils:environmentUtils');

export function debugEnvVars(): void {
    const messageProvider = process.env.MESSAGE || 'discord';
    const llmProvider = process.env.LLM_PROVIDER || 'openai';

    // Required environment variables based on MESSAGE and LLM values
    const requiredEnvVars: string[] = [];

    if (messageProvider === 'discord') {
        requiredEnvVars.push('DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID');
    }

    if (llmProvider === 'openai') {
        requiredEnvVars.push('OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_MODEL');
    }

    // Debug required variables if in debug mode
    if (process.env.BOT_DEBUG_MODE && process.env.BOT_DEBUG_MODE.toLowerCase() === 'true') {
        requiredEnvVars.forEach(varName => {
            const value = process.env[varName];
            debug(`${varName}: ${value}`);
        });
    }

    // Check for missing required variables
    const unsetRequiredVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (unsetRequiredVars.length > 0) {
        console.error(`The following required environment variables are not set: ${unsetRequiredVars.join(', ')}`);
        process.exit(1);
    }
}
