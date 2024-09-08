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
exports.completeSentence = completeSentence;
const debug_1 = __importDefault(require("debug"));
const ConfigurationManager_1 = __importDefault(require("@config/ConfigurationManager"));
const debug = (0, debug_1.default)('app:completeSentence');
const configManager = ConfigurationManager_1.default.getInstance();
/**
 * Completes a sentence using the OpenAI API.
 *
 * @param client - The OpenAiService instance.
 * @param content - The content to complete.
 * @returns The completed sentence.
 */
function completeSentence(client, content) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Using generateChatResponse to get the completion
            const response = yield client.generateChatResponse(content, []);
            // Ensure response is valid and trim any extra whitespace
            const trimmedResponse = response === null || response === void 0 ? void 0 : response.trim();
            if (trimmedResponse) {
                return trimmedResponse;
            }
            else {
                debug('Empty or invalid response received.');
                return ''; // Return an empty string if no valid response
            }
        }
        catch (error) {
            debug('Error completing sentence:', error);
            return ''; // Return an empty string in case of failure
        }
    });
}
