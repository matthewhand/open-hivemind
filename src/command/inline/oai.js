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
exports.OAICommand = void 0;
const debug_1 = __importDefault(require("debug"));
const axios_1 = __importDefault(require("axios"));
const getRandomErrorMessage_1 = require("@src/common/errors/getRandomErrorMessage");
const debug = (0, debug_1.default)('app:oaiCommand');
/**
 * CommandHandler to interact with the OpenAI API for generating text responses.
 * Usage: !oai <prompt>
 */
class OAICommand {
    constructor() {
        this.name = 'oai';
        this.description = 'Interacts with the OpenAI API to generate responses.';
    }
    /**
     * Executes the OAI command using the provided message context and arguments.
     * @param args - The arguments provided with the command.
     * @returns A promise resolving with the execution result.
     */
    execute(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const prompt = args.join(' '); // Combining all arguments to form the prompt
            debug('OAICommand: Generating response for prompt: ' + prompt);
            try {
                const response = yield axios_1.default.post('https://api.openai.com/v1/engines/davinci/completions', {
                    prompt: prompt,
                    max_tokens: 150
                }, {
                    headers: {
                        'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY
                    }
                });
                if (response.data.choices && response.data.choices.length > 0) {
                    const generatedText = response.data.choices[0].text.trim();
                    debug('OAICommand: Response generated successfully');
                    return { success: true, message: generatedText };
                }
                else {
                    debug('OAICommand: No response generated.');
                    return { success: false, message: 'Failed to generate response.' };
                }
            }
            catch (error) {
                debug('OAICommand execute error: ' + error.message);
                return { success: false, message: (0, getRandomErrorMessage_1.getRandomErrorMessage)(), error: error.message };
            }
        });
    }
}
exports.OAICommand = OAICommand;
