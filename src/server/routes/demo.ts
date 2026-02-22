/**
 * Demo Mode Routes
 * 
 * API endpoints for demo/simulation mode functionality
 */

import { Router } from 'express';
import DemoModeService from '../../services/DemoModeService';
import { ErrorUtils, HivemindError } from '../../types/errors';

const router = Router();

/**
 * GET /api/demo/status
 * Get demo mode status
 */
router.get('/status', (req, res) => {
    try {
        const demoService = DemoModeService.getInstance();
        const status = demoService.getDemoStatus();

        res.json({
            ...status,
            message: status.isDemoMode
                ? 'Running in demo mode - no real credentials configured'
                : 'Running in production mode with real credentials',
        });
    } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error) as HivemindError;
        res.status(hivemindError.statusCode || 500).json({
            error: hivemindError.message,
            code: 'DEMO_STATUS_ERROR',
        });
    }
});

/**
 * GET /api/demo/bots
 * Get demo bots
 */
router.get('/bots', (req, res) => {
    try {
        const demoService = DemoModeService.getInstance();
        const bots = demoService.getDemoBots();

        res.json({
            bots,
            count: bots.length,
            isDemo: demoService.isInDemoMode(),
        });
    } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error) as HivemindError;
        res.status(hivemindError.statusCode || 500).json({
            error: hivemindError.message,
            code: 'DEMO_BOTS_ERROR',
        });
    }
});

/**
 * POST /api/demo/chat
 * Send a message to a demo bot and get a simulated response
 */
router.post('/chat', (req, res) => {
    try {
        const { message, botName, channelId, userId, userName } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }

        if (!botName) {
            return res.status(400).json({ error: 'botName is required' });
        }

        const demoService = DemoModeService.getInstance();

        if (!demoService.isInDemoMode()) {
            return res.status(400).json({
                error: 'Demo mode is not active. Configure credentials to use real services.',
                code: 'DEMO_MODE_INACTIVE',
            });
        }

        // Add user message
        const userMsg = demoService.addMessage(
            channelId || 'demo-channel',
            botName,
            message,
            'incoming',
            userId || 'demo-user',
            userName || 'Demo User'
        );

        // Generate bot response
        const responseText = demoService.generateDemoResponse(message, botName);

        // Add bot response
        const botMsg = demoService.addMessage(
            channelId || 'demo-channel',
            botName,
            responseText,
            'outgoing',
            botName,
            botName
        );

        res.json({
            success: true,
            userMessage: userMsg,
            botResponse: botMsg,
            isDemo: true,
        });
    } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error) as HivemindError;
        res.status(hivemindError.statusCode || 500).json({
            error: hivemindError.message,
            code: 'DEMO_CHAT_ERROR',
        });
    }
});

/**
 * GET /api/demo/conversations
 * Get all demo conversations
 */
router.get('/conversations', (req, res) => {
    try {
        const demoService = DemoModeService.getInstance();
        const conversations = demoService.getAllConversations();

        res.json({
            conversations,
            count: conversations.length,
        });
    } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error) as HivemindError;
        res.status(hivemindError.statusCode || 500).json({
            error: hivemindError.message,
            code: 'DEMO_CONVERSATIONS_ERROR',
        });
    }
});

/**
 * GET /api/demo/conversations/:channelId/:botName
 * Get conversation history for a specific channel and bot
 */
router.get('/conversations/:channelId/:botName', (req, res) => {
    try {
        const { channelId, botName } = req.params;
        const demoService = DemoModeService.getInstance();
        const messages = demoService.getConversationHistory(channelId, botName);

        res.json({
            channelId,
            botName,
            messages,
            count: messages.length,
        });
    } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error) as HivemindError;
        res.status(hivemindError.statusCode || 500).json({
            error: hivemindError.message,
            code: 'DEMO_CONVERSATION_HISTORY_ERROR',
        });
    }
});

/**
 * POST /api/demo/reset
 * Reset demo mode (clear all conversations)
 */
router.post('/reset', (req, res) => {
    try {
        const demoService = DemoModeService.getInstance();
        demoService.reset();

        res.json({
            success: true,
            message: 'Demo mode reset - all conversations cleared',
        });
    } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error) as HivemindError;
        res.status(hivemindError.statusCode || 500).json({
            error: hivemindError.message,
            code: 'DEMO_RESET_ERROR',
        });
    }
});

/**
 * GET /api/demo/info
 * Get information about demo mode features
 */
router.get('/info', (req, res) => {
    res.json({
        title: 'Open-Hivemind Demo Mode',
        description: 'Experience the platform without configuring credentials',
        features: [
            'Simulated bot conversations',
            'Multi-platform demonstration (Discord, Slack)',
            'WebUI dashboard preview',
            'Configuration management UI',
            'Activity monitoring simulation',
        ],
        limitations: [
            'No real AI responses (simulated)',
            'No actual messenger connections',
            'Data is not persisted between restarts',
        ],
        howToEnable: [
            'Run without any API keys or tokens configured',
            'Or set DEMO_MODE=true environment variable',
        ],
        howToDisable: [
            'Configure at least one API key or token',
            'Or set DEMO_MODE=false environment variable',
        ],
    });
});

export default router;
