"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSlashCommands = registerSlashCommands;
const debug_1 = __importDefault(require("debug"));
const rest_1 = require("@discordjs/rest");
const v9_1 = require("discord-api-types/v9");
const debug = (0, debug_1.default)('app:registerSlashCommands');
/**
 * Registers slash commands with Discord for a specific guild.
 * @param {string} token - The bot token used for authentication with the Discord API.
 * @param {string} guildId - The ID of the guild where commands will be registered.
 * @param {object[]} commands - The commands to be registered.
 */
function registerSlashCommands(token, guildId, commands) {
    return __awaiter(this, void 0, void 0, function* () {
        const clientId = process.env.CLIENT_ID;
        if (!clientId) {
            debug('Client ID is not defined. Cannot register slash commands.');
            return;
        }
        const rest = new rest_1.REST({ version: '9' }).setToken(token);
        try {
            debug('Registering ' + commands.length + ' slash commands.');
            yield rest.put(v9_1.Routes.applicationGuildCommands(clientId, guildId), { body: commands });
            debug('Successfully registered slash commands.');
        }
        catch (error) {
            debug('Failed to register slash commands: ' + (error instanceof Error ? error.message : String(error)));
        }
    });
}
