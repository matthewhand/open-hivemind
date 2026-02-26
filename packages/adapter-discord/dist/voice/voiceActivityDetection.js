"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceActivityDetection = void 0;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:discord:vad');
class VoiceActivityDetection {
    constructor(connection) {
        this.activeUsers = new Set();
        this.receiver = connection.receiver;
        this.setupListeners();
    }
    setupListeners() {
        this.receiver.speaking.on('start', (userId) => {
            this.activeUsers.add(userId);
            debug(`User ${userId} started speaking`);
        });
        this.receiver.speaking.on('end', (userId) => {
            this.activeUsers.delete(userId);
            debug(`User ${userId} stopped speaking`);
        });
    }
    isUserSpeaking(userId) {
        return this.activeUsers.has(userId);
    }
    getActiveSpeakers() {
        return Array.from(this.activeUsers);
    }
    onUserStartSpeaking(callback) {
        this.receiver.speaking.on('start', callback);
    }
    onUserStopSpeaking(callback) {
        this.receiver.speaking.on('end', callback);
    }
}
exports.VoiceActivityDetection = VoiceActivityDetection;
