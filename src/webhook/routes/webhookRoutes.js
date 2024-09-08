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
exports.configureWebhookRoutes = configureWebhookRoutes;
const debug_1 = __importDefault(require("debug"));
const handleImageMessage_1 = require("@src/message/helpers/processing/handleImageMessage");
const debug = (0, debug_1.default)('app:webhookRoutes');
function configureWebhookRoutes(app, client, DISCORD_CHAT_CHANNEL_ID) {
    app.post('/webhook', (req, res) => __awaiter(this, void 0, void 0, function* () {
        debug('Received webhook:', JSON.stringify(req.body));
        const predictionId = req.body.id;
        const predictionStatus = req.body.status;
        const resultArray = req.body.output;
        const imageUrl = handleImageMessage_1.predictionImageMap.get(predictionId);
        if (!predictionId || !predictionStatus) {
            debug('Missing predictionId or predictionStatus:', { predictionId, predictionStatus });
            return res.status(400).send({ error: 'Missing predictionId or predictionStatus' });
        }
        debug('Image URL:', imageUrl);
        const channel = client.channels.cache.get(DISCORD_CHAT_CHANNEL_ID);
        if (channel) {
            let resultMessage;
            if (predictionStatus === 'succeeded') {
                const resultText = resultArray.join(' ');
                resultMessage = `${resultText}\nImage URL: ${imageUrl}`;
            }
            else if (predictionStatus === 'processing') {
                debug('Processing:', predictionId);
                return res.sendStatus(200);
            }
            else {
                resultMessage = `Prediction ID: ${predictionId}\nStatus: ${predictionStatus}`;
            }
            yield channel.send(resultMessage).catch(error => {
                debug('Failed to send message to channel:', error.message);
            });
            handleImageMessage_1.predictionImageMap.delete(predictionId);
        }
        else {
            debug('Channel not found for ID:', DISCORD_CHAT_CHANNEL_ID);
        }
        res.setHeader('Content-Type', 'application/json');
        res.sendStatus(200);
    }));
}
