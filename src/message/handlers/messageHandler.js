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
exports.messageHandler = messageHandler;
const debug_1 = __importDefault(require("debug"));
const validateMessage_1 = require("@src/message/helpers/processing/validateMessage");
const processCommand_1 = require("@src/message/helpers/processing/processCommand");
const getMessageProvider_1 = require("@src/message/management/getMessageProvider");
const getLlmProvider_1 = require("@src/message/management/getLlmProvider");
const shouldReplyToMessage_1 = require("@src/message/helpers/processing/shouldReplyToMessage");
const ResponseTimingManager_1 = __importDefault(require("@src/message/helpers/timing/ResponseTimingManager"));
const ConfigurationManager_1 = __importDefault(require("@config/ConfigurationManager"));
const sendFollowUpRequest_1 = require("@src/message/helpers/followUp/sendFollowUpRequest");
const debug = (0, debug_1.default)('app:messageHandler');
const configManager = ConfigurationManager_1.default.getInstance();
const messageConfig = configManager.getConfig('message'); // Properly initializing messageConfig
/**
 * Message Handler
 *
 * Handles incoming messages by validating them, processing any commands they contain, and managing
 * AI responses using the appropriate message provider. This function ensures that each message is
 * processed accurately based on its content and context, while also considering response timing and
 * follow-up logic.
 *
 * @param msg - The original message object implementing the IMessage interface.
 * @param historyMessages - The history of previous messages for context, defaults to an empty array.
 * @returns {Promise<void>}
 */
function messageHandler(msg_1) {
    return __awaiter(this, arguments, void 0, function* (msg, historyMessages = []) {
        // Guard: Ensure a valid message object is provided
        if (!msg) {
            debug('No message provided.');
            return;
        }
        const startTime = Date.now();
        debug('Received message with ID:', msg.getMessageId(), 'at', new Date(startTime).toISOString());
        // Type Guard: Ensure msg implements IMessage and has necessary methods
        if (!(msg && 'getMessageId' in msg && typeof msg.getMessageId === 'function')) {
            debug('msg is not a valid IMessage instance.');
            return;
        }
        debug('msg is a valid instance of IMessage.');
        // Guard: Check that getText method exists and is valid
        if (typeof msg.getText !== 'function') {
            debug('msg does not have a valid getText method.');
            return;
        }
        debug('msg has a valid getText method.');
        // Guard: Ensure the message is not empty
        if (!msg.getText().trim()) {
            debug('Received an empty message.');
            return;
        }
        // Validate the message
        if (!(0, validateMessage_1.validateMessage)(msg)) {
            debug('Message validation failed.');
            return;
        }
        debug('Message validated successfully.');
        const messageProvider = (0, getMessageProvider_1.getMessageProvider)();
        const channelId = msg.getChannelId();
        // Process the command within the message
        let commandProcessed = false;
        yield (0, processCommand_1.processCommand)(msg, (result) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if command is allowed and if MESSAGE_COMMAND_AUTHORISED_USERS is configured
                if (messageConfig === null || messageConfig === void 0 ? void 0 : messageConfig.MESSAGE_COMMAND_AUTHORISED_USERS) {
                    const allowedUsers = messageConfig.MESSAGE_COMMAND_AUTHORISED_USERS.split(',');
                    if (!allowedUsers.includes(msg.getAuthorId())) {
                        debug('Command not authorized for user:', msg.getAuthorId());
                        return;
                    }
                }
                yield messageProvider.sendMessageToChannel(channelId, result);
                commandProcessed = true;
                debug('Command reply sent successfully.');
            }
            catch (replyError) {
                debug('Failed to send command reply:', replyError);
            }
        }));
        if (commandProcessed) {
            debug('Command processed, skipping LLM response.');
            return;
        }
        // Process LLM chat response if enabled
        if ((messageConfig === null || messageConfig === void 0 ? void 0 : messageConfig.MESSAGE_LLM_CHAT) && (0, shouldReplyToMessage_1.shouldReplyToMessage)(msg)) {
            const llmProvider = (0, getLlmProvider_1.getLlmProvider)();
            const llmResponse = yield llmProvider.generateChatResponse(msg.getText(), historyMessages); // Convert to string if needed
            if (llmResponse) {
                // Schedule the message with ResponseTimingManager
                const timingManager = ResponseTimingManager_1.default.getInstance();
                timingManager.scheduleMessage(channelId, llmResponse, Date.now() - startTime, (content) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        yield messageProvider.sendMessageToChannel(channelId, content);
                        debug('LLM response sent successfully.');
                    }
                    catch (replyError) {
                        debug('Failed to send LLM response:', replyError);
                    }
                }));
            }
        }
        // Implement follow-up logic if both LLM_CHAT and FOLLOW_UP are enabled
        if ((messageConfig === null || messageConfig === void 0 ? void 0 : messageConfig.MESSAGE_LLM_CHAT) && (messageConfig === null || messageConfig === void 0 ? void 0 : messageConfig.MESSAGE_LLM_FOLLOW_UP)) {
            // Guard: Ensure command processing is enabled
            if (!messageConfig.MESSAGE_COMMAND_INLINE && !messageConfig.MESSAGE_COMMAND_SLASH) {
                debug('Follow-up logic is skipped because command processing is not enabled.');
                return;
            }
            debug('Follow-up logic is enabled.');
            // Using helper function to handle follow-up
            yield (0, sendFollowUpRequest_1.sendFollowUpRequest)(msg, channelId, 'AI response follow-up');
            debug('Follow-up request handled.');
        }
        debug('Message handling completed.');
    });
}
