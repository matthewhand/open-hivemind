/**
 * Demo Mode Routes
 *
 * API endpoints for demo/simulation mode functionality
 */

import { Router } from 'express';
import { container } from 'tsyringe';
import { ApiResponse } from '@src/server/utils/apiResponse';
import DemoModeService from '../../services/DemoModeService';
import { HTTP_STATUS } from '../../types/constants';
import { ErrorUtils } from '../../types/errors';
import { ChatGenerateSchema, EmptySchema } from '../../validation/schemas/miscSchema';
import { validateRequest } from '../../validation/validateRequest';

const router = Router();

/**
 * GET /api/demo/status
 * Get demo mode status
 */
router.get('/status', (req, res) => {
  try {
    const demoService = container.resolve(DemoModeService);
    const status = demoService.getDemoStatus();

    res.json(
      ApiResponse.success({
        ...status,
        message: status.isDemoMode
          ? 'Running in demo mode - no real credentials configured'
          : 'Running in production mode with real credentials',
      })
    );
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    res
      .status(statusCode)
      .json(ApiResponse.error(ErrorUtils.getMessage(hivemindError), 'DEMO_STATUS_ERROR'));
  }
});

/**
 * GET /api/demo/bots
 * Get demo bots
 */
router.get('/bots', (req, res) => {
  try {
    const demoService = container.resolve(DemoModeService);
    const bots = demoService.getDemoBots();

    res.json(
      ApiResponse.success({
        bots,
        count: bots.length,
        isDemo: demoService.isInDemoMode(),
      })
    );
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    res
      .status(statusCode)
      .json(ApiResponse.error(ErrorUtils.getMessage(hivemindError), 'DEMO_BOTS_ERROR'));
  }
});

/**
 * POST /api/demo/chat
 * Send a message to a demo bot and get a simulated response
 */
router.post('/chat', validateRequest(ChatGenerateSchema), (req, res) => {
  try {
    const { message, botName, channelId, userId, userName } = req.body;

    if (!message) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('message is required'));
      return;
    }

    if (!botName) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('botName is required'));
      return;
    }

    const demoService = container.resolve(DemoModeService);

    if (!demoService.isInDemoMode()) {
      res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          ApiResponse.error(
            'Demo mode is not active. Configure credentials to use real services.',
            'DEMO_MODE_INACTIVE'
          )
        );
      return;
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

    res.json(
      ApiResponse.success({
        success: true,
        userMessage: userMsg,
        botResponse: botMsg,
        isDemo: true,
      })
    );
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    res
      .status(statusCode)
      .json(ApiResponse.error(ErrorUtils.getMessage(hivemindError), 'DEMO_CHAT_ERROR'));
  }
});

/**
 * GET /api/demo/conversations
 * Get all demo conversations
 */
router.get('/conversations', (req, res) => {
  try {
    const demoService = container.resolve(DemoModeService);
    const conversations = demoService.getAllConversations();

    res.json(
      ApiResponse.success({
        conversations,
        count: conversations.length,
      })
    );
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    res
      .status(statusCode)
      .json(ApiResponse.error(ErrorUtils.getMessage(hivemindError), 'DEMO_CONVERSATIONS_ERROR'));
  }
});

/**
 * GET /api/demo/conversations/:channelId/:botName
 * Get conversation history for a specific channel and bot
 */
router.get('/conversations/:channelId/:botName', (req, res) => {
  try {
    const { channelId, botName } = req.params;
    const demoService = container.resolve(DemoModeService);
    const messages = demoService.getConversationHistory(channelId, botName);

    res.json(
      ApiResponse.success({
        channelId,
        botName,
        messages,
        count: messages.length,
      })
    );
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    res
      .status(statusCode)
      .json(
        ApiResponse.error(ErrorUtils.getMessage(hivemindError), 'DEMO_CONVERSATION_HISTORY_ERROR')
      );
  }
});

/**
 * POST /api/demo/reset
 * Reset demo mode (clear all conversations)
 */
router.post('/reset', validateRequest(EmptySchema), (req, res) => {
  try {
    const demoService = container.resolve(DemoModeService);
    demoService.reset();

    res.json(ApiResponse.success());
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const statusCode = ErrorUtils.getStatusCode(hivemindError) || 500;
    res
      .status(statusCode)
      .json(ApiResponse.error(ErrorUtils.getMessage(hivemindError), 'DEMO_RESET_ERROR'));
  }
});

/**
 * GET /api/demo/info
 * Get information about demo mode features
 */
router.get('/info', (req, res) => {
  res.json(
    ApiResponse.success({
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
    })
  );
});

export default router;
