"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeClient = void 0;
const discord_js_1 = require("discord.js");
const debug_1 = __importDefault(require("debug"));
const log = (0, debug_1.default)('app:initializeClient');
/**
 * Initializes the Discord client with the necessary intents.
 *
 * @returns {Client} The initialized Discord client instance.
 */
const initializeClient = () => {
    log('Initializing Discord client with intents: Guilds, GuildMessages, GuildVoiceStates');
    return new discord_js_1.Client({
        intents: [
            discord_js_1.GatewayIntentBits.Guilds,
            discord_js_1.GatewayIntentBits.GuildMessages,
            discord_js_1.GatewayIntentBits.GuildVoiceStates,
        ],
    });
};
exports.initializeClient = initializeClient;
