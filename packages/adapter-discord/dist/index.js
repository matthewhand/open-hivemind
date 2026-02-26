"use strict";
/**
 * @hivemind/adapter-discord
 *
 * Discord adapter for Open Hivemind messaging platform.
 * Implements IMessengerService for Discord integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTypingIndicator = exports.DiscordConnectionTest = exports.DiscordMessage = exports.DiscordService = exports.DiscordAdapter = void 0;
// Re-export the main Discord adapter (renamed from Service for clarity)
var DiscordService_1 = require("./DiscordService");
Object.defineProperty(exports, "DiscordAdapter", { enumerable: true, get: function () { return DiscordService_1.DiscordService; } });
Object.defineProperty(exports, "DiscordService", { enumerable: true, get: function () { return DiscordService_1.DiscordService; } });
// Export message class
var DiscordMessage_1 = require("./DiscordMessage");
Object.defineProperty(exports, "DiscordMessage", { enumerable: true, get: function () { return DiscordMessage_1.DiscordMessage; } });
// Export connection test utility
var DiscordConnectionTest_1 = require("./DiscordConnectionTest");
Object.defineProperty(exports, "DiscordConnectionTest", { enumerable: true, get: function () { return DiscordConnectionTest_1.DiscordConnectionTest; } });
// Export typing indicator
var startTypingIndicator_1 = require("./startTypingIndicator");
Object.defineProperty(exports, "startTypingIndicator", { enumerable: true, get: function () { return startTypingIndicator_1.startTypingIndicator; } });
