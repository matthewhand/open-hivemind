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
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeMessage = summarizeMessage;
/**
 * Summarizes a long message to fit within Discord's message limit.
 * @param message - The message text to summarize.
 * @returns A summarized version of the message.
 */
function summarizeMessage(message) {
    return __awaiter(this, void 0, void 0, function* () {
        // Here you would typically use an external API or a custom algorithm to shorten the message.
        // For simplicity, we'll just truncate it to the max allowed length.
        const maxLength = 2000; // Discord's character limit per message.
        return message.length > maxLength ? message.substring(0, maxLength - 3) + '...' : message;
    });
}
