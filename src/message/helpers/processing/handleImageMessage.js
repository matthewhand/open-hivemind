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
exports.predictionImageMap = void 0;
exports.createPrediction = createPrediction;
exports.handleImageMessage = handleImageMessage;
const axios_1 = __importDefault(require("axios"));
/**
 * A map that stores the association between prediction IDs and image URLs.
 */
exports.predictionImageMap = new Map();
/**
 * Creates a prediction via Replicate's REST API using the provided image URL.
 *
 * @param imageUrl - The URL of the image to analyze.
 * @returns The prediction result from the API.
 */
function createPrediction(imageUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const postData = {
                version: process.env.REPLICATE_MODEL_VERSION || 'default-model-version',
                input: {
                    image: imageUrl,
                    prompt: process.env.REPLICATE_DEFAULT_PROMPT || 'Please describe this image'
                }
            };
            if (!process.env.REPLICATE_WEBHOOK_URL) {
                postData.sync = true; // Wait synchronously for the prediction
            }
            else {
                postData.webhook = process.env.REPLICATE_WEBHOOK_URL;
                postData.webhook_events_filter = ['start', 'completed'];
            }
            const response = yield axios_1.default.post('https://api.replicate.com/v1/predictions', postData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Token ' + process.env.REPLICATE_API_TOKEN
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Failed to create prediction:', error.response ? error.response.data : error.message);
            throw new Error('Failed to create prediction');
        }
    });
}
/**
 * Handles an image message by creating a prediction via Replicate's REST API.
 *
 * @param message - The message object containing the image to analyze.
 * @returns A boolean indicating whether the message was processed.
 */
function handleImageMessage(message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (message.channel.id !== process.env.DISCORD_CHAT_CHANNEL_ID) {
                console.debug('Ignoring message in channel ' + message.channel.id);
                return false;
            }
            const attachments = message.attachments;
            if (attachments.size > 0) {
                const imageUrl = attachments.first().url;
                console.debug('Image URL: ' + imageUrl);
                const prediction = yield createPrediction(imageUrl);
                if (!process.env.REPLICATE_WEBHOOK_URL) {
                    // Handle synchronous prediction result
                    message.reply('Prediction result: ' + JSON.stringify(prediction));
                }
                else {
                    // Handle asynchronous prediction (via webhook)
                    const predictionId = prediction.id;
                    console.log('Prediction ID: ' + predictionId);
                    exports.predictionImageMap.set(predictionId, imageUrl);
                }
                return true;
            }
            else {
                console.debug('No attachments found');
                return false;
            }
        }
        catch (error) {
            console.error('Error in handleImageMessage: ' + error.message);
            return false;
        }
    });
}
