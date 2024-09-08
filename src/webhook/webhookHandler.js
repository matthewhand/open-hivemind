"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = void 0;
const config_1 = __importDefault(require("@src/config"));
const webhookRoutes_1 = require("./routes/webhookRoutes");
const express_1 = __importDefault(require("express"));
const discord_js_1 = require("discord.js");
const webhookSecurity_1 = require("./security/webhookSecurity");
// Initialize Discord client
const client = new discord_js_1.Client({ intents: [] });
// Handle webhook requests
const handleWebhook = (req, res) => {
    const botToken = config_1.default.get('DISCORD_BOT_TOKEN');
    const chatChannelId = config_1.default.get('DISCORD_CHAT_CHANNEL_ID');
    if (!botToken || !chatChannelId) {
        res.status(400).send('Invalid configuration');
        return;
    }
    // Create Express app and configure routes
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    // Apply security middleware
    app.use(webhookSecurity_1.verifyWebhookToken);
    app.use(webhookSecurity_1.verifyIpWhitelist);
    (0, webhookRoutes_1.configureWebhookRoutes)(app, client, chatChannelId);
    // Process webhook payload
    const { body } = req;
    console.log('Received webhook data:', body);
    res.status(200).send('Webhook received');
};
exports.handleWebhook = handleWebhook;
