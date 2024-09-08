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
exports.loginToDiscord = loginToDiscord;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:loginToDiscord');
/**
 * Logs in the Discord client using the provided bot token.
 *
 * @param client - The Discord client instance to log in.
 * @param token - The Discord bot token.
 * @returns A promise that resolves when the login is successful.
 * @throws Will throw an error if the token is not provided or login fails.
 */
function loginToDiscord(client, token) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('Attempting to log in to Discord.');
        // Guard clause: Ensure the token is provided.
        if (!token) {
            const errorMessage = 'DISCORD_TOKEN is not defined.';
            debug(errorMessage);
            throw new Error(errorMessage);
        }
        try {
            const result = yield client.login(token);
            debug('Successfully logged in to Discord.');
            return result;
        }
        catch (error) {
            const errorMessage = 'Failed to log in to Discord: ' + (error instanceof Error ? error.message : String(error));
            debug(errorMessage);
            throw new Error(errorMessage);
        }
    });
}
