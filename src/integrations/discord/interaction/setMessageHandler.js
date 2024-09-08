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
exports.setMessageHandler = setMessageHandler;
const debug_1 = __importDefault(require("debug"));
const discordConfig_1 = __importDefault(require("@integrations/discord/interfaces/discordConfig"));
const fetchChannel_1 = require("@src/integrations/discord/fetchers/fetchChannel");
const DiscordMessage_1 = __importDefault(require("@src/integrations/discord/DiscordMessage"));
const debug = (0, debug_1.default)('app:setMessageHandler');
/**
 * Set Message Handler
 *
 * This function sets up the message handler for the Discord client. It listens for incoming messages,
 * processes them based on specific criteria, and triggers appropriate responses or actions.
 *
 * Key Features:
 * - Listens to messages on the Discord client.
 * - Processes messages to determine if they should be handled by the bot.
 * - Provides logging for message handling and processing.
 *
 * @param client - The Discord client instance.
 * @param handler - The function to handle incoming messages.
 * @param typingTimestamps - Map to store typing timestamps.
 * @param fetchMessages - Function to fetch messages.
 */
function setMessageHandler(client, handler, typingTimestamps, fetchMessages) {
    client.on('typingStart', (typing) => {
        typingTimestamps.set(typing.channel.id, Date.now());
    });
    client.on('messageCreate', (discordMessage) => __awaiter(this, void 0, void 0, function* () {
        try {
            debug('Received Message object: ' + JSON.stringify(discordMessage));
            if (!client) {
                debug('Discord client is not initialized.');
                return;
            }
            if (!discordMessage.id || !discordMessage.content) {
                debug('Invalid or incomplete Message received: ID: ' + discordMessage.id + '  Content: ' + discordMessage.content);
                return;
            }
            // Guard: Ensure discordConfig is not null
            if (discordConfig_1.default && discordMessage.author.id === discordConfig_1.default.get('DISCORD_CLIENT_ID')) {
                debug('Skipping response to own Message ID: ' + discordMessage.id);
                return;
            }
            debug('Processed Message ID: ' + discordMessage.id);
            const channel = yield (0, fetchChannel_1.fetchChannel)(client, discordMessage.channelId);
            if (!channel) {
                debug('Could not fetch channel with ID: ' + discordMessage.channelId);
                return;
            }
            debug('Fetched channel: ' + channel);
            if (channel.topic) {
                const historyMessages = yield fetchMessages(channel.id);
                if (historyMessages) {
                    debug('Channel topic: ' + (channel.topic || 'No topic') + '. History messages count: ' + historyMessages.length);
                }
                debug('Executing Message handler on channel ' + channel.id);
                // Ensure DiscordMessage is properly instantiated before passing to handler
                const discordMessageWrapped = new DiscordMessage_1.default(discordMessage);
                yield handler(discordMessageWrapped, historyMessages);
            }
            else {
                debug('Channel ID: ' + channel.id + ' does not support topics.');
            }
        }
        catch (error) {
            debug('Error processing Message: ' + (error instanceof Error ? error.message : String(error)));
        }
    }));
}
