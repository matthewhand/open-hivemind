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
exports.listModels = listModels;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:OpenAiService');
/**
 * Lists all available models from OpenAI.
 *
 * @param openai - The OpenAI API client instance.
 * @returns {Promise<any>} - The list of available models.
 */
function listModels(openai) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield openai.models.list();
            debug('Available models:', response.data);
            return response.data;
        }
        catch (error) {
            debug('Error listing models:', error);
            throw new Error(`Failed to list models: ${error.message}`);
        }
    });
}
