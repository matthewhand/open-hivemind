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
exports.InlineBanCommand = void 0;
const debug_1 = __importDefault(require("debug"));
const ban_1 = require("@command/common/ban");
const debug = (0, debug_1.default)('app:inlineBanCommand');
/**
 * InlineBanCommand
 *
 * Provides an inline command to ban a user in a Discord guild.
 *
 * This command extends the functionality provided by the `banUser` function
 * and integrates it into the inline command structure, allowing for easier
 * access and execution within Discord.
 */
class InlineBanCommand {
    execute(args) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { message, args: commandArgs } = args;
            const reason = commandArgs.slice(1).join(' ') || 'No reason provided';
            try {
                const target = (_a = message.guild) === null || _a === void 0 ? void 0 : _a.members.cache.get(commandArgs[0]);
                if (!target) {
                    return { success: false, message: 'User not found.', error: 'User not found' };
                }
                yield (0, ban_1.banUser)(message, target);
                return { success: true, message: `User ${target.user.tag} has been banned.` };
            }
            catch (error) {
                debug('Error executing InlineBanCommand: ' + error.message);
                return { success: false, message: 'Failed to ban the user.', error: error.message };
            }
        });
    }
}
exports.InlineBanCommand = InlineBanCommand;
