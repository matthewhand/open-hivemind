"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugEnvVars = debugEnvVars;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:utils:environmentUtils');
function debugEnvVars() {
    const messageProvider = process.env.MESSAGE || 'discord';
    const llmProvider = process.env.LLM_PROVIDER || 'openai';
    // Required environment variables based on MESSAGE and LLM values
    const requiredEnvVars = [];
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
