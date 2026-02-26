"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypingActivity = void 0;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:TypingActivity');
/**
 * Tracks recent "typingStart" signals from other users in a channel.
 * Used to delay starting our own typing indicator to feel less interruptive.
 */
class TypingActivity {
    constructor() {
        this.byChannel = new Map();
    }
    static getInstance() {
        if (!TypingActivity.instance) {
            TypingActivity.instance = new TypingActivity();
        }
        return TypingActivity.instance;
    }
    recordTyping(channelId, userId) {
        if (!channelId || !userId) {
            return;
        }
        const now = Date.now();
        let byUser = this.byChannel.get(channelId);
        if (!byUser) {
            byUser = new Map();
            this.byChannel.set(channelId, byUser);
        }
        byUser.set(userId, now);
        debug(`Typing recorded channel=${channelId} user=${userId}`);
    }
    getActiveTypistCount(channelId, windowMs) {
        const now = Date.now();
        const byUser = this.byChannel.get(channelId);
        if (!byUser) {
            return 0;
        }
        for (const [userId, ts] of byUser.entries()) {
            if (now - ts >= windowMs) {
                byUser.delete(userId);
            }
        }
        return byUser.size;
    }
    isOthersTyping(channelId, windowMs) {
        return this.getActiveTypistCount(channelId, windowMs) > 0;
    }
    // For tests
    clear(channelId) {
        if (channelId) {
            this.byChannel.delete(channelId);
            return;
        }
        this.byChannel.clear();
    }
}
exports.TypingActivity = TypingActivity;
exports.default = TypingActivity;
