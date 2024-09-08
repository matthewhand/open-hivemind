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
const discord_js_1 = require("discord.js");
const debug = (0, debug_1.default)('app:mutingUtils');
/**
 * Mutes a user in the specified channel by adding the 'Muted' role.
 *
 * This function fetches the member using their user ID, then finds and applies the 'Muted' role.
 * If the role does not exist, it logs an appropriate message and exits.
 *
 * @param {TextChannel} channel - The channel where the user will be muted.
 * @param {string} userId - The ID of the user to be muted.
 * @returns {Promise<void>} Resolves when the user is muted.
 */
function muteUser(channel, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        debug('Muting user with ID: ' + userId + ' in channel: ' + channel.id);
        const member = yield channel.guild.members.fetch(userId);
        const role = (_a = channel.guild.roles) === null || _a === void 0 ? void 0 : _a.cache.find(role => role.name === 'Muted');
        if (!role) {
            debug('Mute role not found');
            return;
        }
        yield member.roles.add(role);
        debug('User muted successfully');
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('User Muted')
            .setDescription('The user has been muted.')
            .addFields({ name: 'User ID', value: userId })
            .setColor('#FF0000');
        yield channel.send({ embeds: [embed] });
        debug('Mute confirmation message sent');
    });
}
