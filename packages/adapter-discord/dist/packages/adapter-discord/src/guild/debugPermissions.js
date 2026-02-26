"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugPermissions = void 0;
const discord_js_1 = require("discord.js");
const debug_1 = __importDefault(require("debug"));
const log = (0, debug_1.default)('app:debugPermissions');
/**
 * Debugs and logs the bot's permissions in each guild it is part of.
 *
 * @param client - The Discord client instance to check permissions for.
 */
const debugPermissions = async (client) => {
    client.guilds.cache.forEach(guild => {
        var _a;
        const botMember = guild.members.cache.get((_a = client.user) === null || _a === void 0 ? void 0 : _a.id);
        if (!botMember) {
            log(`Bot not found in guild: ${guild.name}`);
            return;
        }
        const permissions = botMember.permissions;
        const requiredPermissions = [
            discord_js_1.PermissionsBitField.Flags.SendMessages,
            discord_js_1.PermissionsBitField.Flags.ViewChannel,
            discord_js_1.PermissionsBitField.Flags.ReadMessageHistory,
        ];
        requiredPermissions.forEach(permission => {
            if (!permissions.has(permission)) {
                log(`Bot lacks permission ${permission.toString()} in guild: ${guild.name}`);
            }
        });
        log(`Permissions in guild "${guild.name}":`, permissions.toArray().map(perm => perm.toString()));
    });
};
exports.debugPermissions = debugPermissions;
