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
exports.muteUser = muteUser;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:muteUser');
/**
 * Mute a User in Discord via Command
 *
 * Provides functionality to mute a user in a Discord guild through a bot command.
 * Validates the interaction and target user, checks if the user is in a voice channel, and mutes them.
 * Replies to the interaction with the result of the operation.
 *
 * @param interaction - The command interaction that triggered the mute.
 * @param target - The target guild member to mute.
 */
function muteUser(interaction, target) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Validate the interaction and target
            if (!interaction) {
                debug('No interaction provided.');
                throw new Error('Interaction is required to mute a user.');
            }
            if (!target) {
                debug('No target provided.');
                throw new Error('Target is required to mute a user.');
            }
            // Check if the target is in a voice channel and can be muted
            if (!target.voice.channel) {
                debug('Target user ' + target.user.tag + ' is not in a voice channel in guild ' + interaction.guildId);
                yield interaction.reply('User ' + target.user.tag + ' is not in a voice channel.');
                return;
            }
            // Attempt to mute the target user
            yield target.voice.setMute(true, 'Muted by bot command');
            debug('User ' + target.user.tag + ' has been muted in guild ' + interaction.guildId);
            // Confirm the mute operation
            yield interaction.reply('User ' + target.user.tag + ' has been muted.');
        }
        catch (error) {
            const targetInfo = target ? target.user.tag : 'unknown user';
            debug('Failed to mute user ' + targetInfo + ' in guild ' + interaction.guildId + ': ' + error.message);
            yield interaction.reply('Failed to mute ' + (target ? target.user.tag : 'the user') + '.');
        }
    });
}
