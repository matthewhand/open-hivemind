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
exports.banUser = banUser;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:banUser');
/**
 * Ban a User in Discord via Command
 *
 * Provides functionality to ban a user in a Discord guild through a bot command.
 * Validates the interaction and target user, checks if the user can be banned, and bans them.
 * Replies to the interaction with the result of the operation.
 *
 * @param interaction - The command interaction that triggered the ban.
 * @param target - The target guild member to ban.
 */
function banUser(interaction, target) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Validate the interaction and target
            if (!interaction) {
                debug('No interaction provided.');
                throw new Error('Interaction is required to ban a user.');
            }
            if (!target) {
                debug('No target provided.');
                throw new Error('Target is required to ban a user.');
            }
            // Check if the target can be banned
            if (!target.bannable) {
                debug('Target user ' + target.user.tag + ' cannot be banned in guild ' + interaction.guildId);
                yield interaction.reply('User ' + target.user.tag + ' cannot be banned.');
                return;
            }
            // Attempt to ban the target user
            yield target.ban({ reason: 'Banned by bot command' });
            debug('User ' + target.user.tag + ' has been banned in guild ' + interaction.guildId);
            // Confirm the ban operation
            yield interaction.reply('User ' + target.user.tag + ' has been banned.');
        }
        catch (error) {
            const targetInfo = target ? target.user.tag : 'unknown user';
            debug('Failed to ban user ' + targetInfo + ' in guild ' + interaction.guildId + ': ' + error.message);
            yield interaction.reply('Failed to ban ' + (target ? target.user.tag : 'the user') + '.');
        }
    });
}
