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
exports.MemGPTCommand = void 0;
const debug_1 = __importDefault(require("debug"));
const axios_1 = __importDefault(require("axios"));
const getRandomErrorMessage_1 = require("@src/common/errors/getRandomErrorMessage");
const debug = (0, debug_1.default)('app:memGPTCommand');
/**
 * CommandHandler to interact with the MemGPT service.
 * Usage: !memgpt <action> <message>
 */
class MemGPTCommand {
    constructor() {
        this.name = 'memgpt';
        this.description = 'Interacts with the MemGPT service to send and receive messages.';
    }
    /**
     * Executes the MemGPT command using the provided message context and arguments.
     * @param args - The arguments provided with the command.
     * @returns A promise resolving with the execution result.
     */
    execute(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const action = args[0]; // Assuming 'action' is the first argument
            const messageContent = args.slice(1).join(' '); // Joining the remaining arguments
            try {
                const requestUrl = process.env.MEMGPT_ENDPOINT_URL + '/api/agents/message';
                const userId = process.env.MEMGPT_USER_ID;
                const memGptApiKey = process.env.MEMGPT_API_KEY;
                const headers = memGptApiKey ? { 'Authorization': 'Bearer ' + memGptApiKey } : {};
                const response = yield axios_1.default.post(requestUrl, {
                    agent_id: action,
                    user_id: userId,
                    message: messageContent
                }, { headers });
                debug('MemGPTCommand: Request sent to MemGPT for agent ' + action + ' with message: ' + messageContent);
                debug('MemGPTCommand: Response received from MemGPT with data: ' + response.data);
                return { success: true, message: response.data };
            }
            catch (error) {
                debug('MemGPTCommand execute error: ' + error.message);
                return { success: false, message: (0, getRandomErrorMessage_1.getRandomErrorMessage)(), error: error.message };
            }
        });
    }
}
exports.MemGPTCommand = MemGPTCommand;
