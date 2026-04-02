import { Router } from 'express';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { createLogger } from '../../common/StructuredLogger';
import { BotManager } from '../../managers/BotManager';
import { EmptyBodySchema, OnboardingStepSchema } from '../../validation/schemas/onboardingSchema';
import { validateRequest } from '../../validation/validateRequest';
import { asyncErrorHandler } from '../middleware/errorHandler';

const router = Router();
const logger = createLogger('onboardingRouter');

// In-memory flag (persisted per server process). A production implementation
// would store this in a database or config file, but for the initial feature
// this keeps things simple and dependency-free.
let onboardingCompleted = false;
let onboardingStep = 1;

/**
 * @openapi
 * /api/onboarding/status:
 *   get:
 *     summary: Get onboarding status
 *     tags: [Onboarding]
 *     responses:
 *       200:
 *         description: Onboarding completion status
 */
router.get('/status', asyncErrorHandler(async (req, res) => {
  try {
    // If already marked complete, return immediately
    if (onboardingCompleted) {
      return res.json(ApiResponse.success({ completed: true, step: 5 }));
    }

    // Auto-detect completion: if bots exist, onboarding is implicitly done
    const manager = await BotManager.getInstance();
    const bots = await manager.getAllBots();
    if (bots.length > 0) {
      onboardingCompleted = true;
      return res.json(ApiResponse.success({ completed: true, step: 5 }));
    }

    return res.json(ApiResponse.success({ completed: false, step: onboardingStep }));
  } catch (err) {
    logger.error(
      'Failed to get onboarding status',
      err instanceof Error ? err : new Error(String(err))
    );
    return res.json(ApiResponse.success({ completed: false, step: 1 }));
  }
});

/**
 * @openapi
 * /api/onboarding/complete:
 *   post:
 *     summary: Mark onboarding as completed
 *     tags: [Onboarding]
 *     responses:
 *       200:
 *         description: Onboarding marked as completed
 */
router.post('/complete', validateRequest(EmptyBodySchema), (_req, res) => {
  onboardingCompleted = true;
  onboardingStep = 5;
  logger.info('Onboarding marked as completed');
  return res.json(ApiResponse.success({ completed: true, step: 5 }));
});

/**
 * @openapi
 * /api/onboarding/reset:
 *   post:
 *     summary: Reset onboarding state (restart wizard)
 *     tags: [Onboarding]
 *     responses:
 *       200:
 *         description: Onboarding reset successfully
 */
router.post('/reset', validateRequest(EmptyBodySchema), (_req, res) => {
  onboardingCompleted = false;
  onboardingStep = 1;
  logger.info('Onboarding reset');
  return res.json(ApiResponse.success({ completed: false, step: 1 }));
});

/**
 * @openapi
 * /api/onboarding/step:
 *   post:
 *     summary: Update current onboarding step
 *     tags: [Onboarding]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               step:
 *                 type: number
 *     responses:
 *       200:
 *         description: Step updated
 */
router.post('/step', validateRequest(OnboardingStepSchema), (req, res) => {
  const { step } = req.body;
  onboardingStep = step;
  return res.json(ApiResponse.success({ completed: false, step: onboardingStep }));
});

export default router;
