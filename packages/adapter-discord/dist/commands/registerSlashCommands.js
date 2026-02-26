"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSlashCommands = registerSlashCommands;
const debug_1 = __importDefault(require("debug"));
const rest_1 = require("@discordjs/rest");
const v9_1 = require("discord-api-types/v9");
const errors_1 = require("@src/types/errors");
const debug = (0, debug_1.default)('app:registerSlashCommands');
/**
 * Registers slash commands with Discord for a specific guild.
 * @param {string} token - The bot token used for authentication with the Discord API.
 * @param {string} guildId - The ID of the guild where commands will be registered.
 * @param {object[]} commands - The commands to be registered.
 */
async function registerSlashCommands(token, guildId, commands) {
    const clientId = process.env.CLIENT_ID;
    if (!clientId) {
        debug('Client ID is not defined. Cannot register slash commands.');
        return;
    }
    const rest = new rest_1.REST({ version: '9' }).setToken(token);
    try {
        debug('Registering ' + commands.length + ' slash commands.');
        await rest.put(v9_1.Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        debug('Successfully registered slash commands.');
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        debug('Failed to register slash commands: ' + errors_1.ErrorUtils.getMessage(hivemindError));
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('Discord register slash commands error:', hivemindError);
        }
    }
}
