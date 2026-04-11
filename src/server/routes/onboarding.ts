import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { createLogger } from '../../common/StructuredLogger';
import { getLlmDefaultStatus } from '../../config/llmDefaultStatus';
import { BotManager } from '../../managers/BotManager';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import { EmptyBodySchema, OnboardingStepSchema } from '../../validation/schemas/onboardingSchema';
import { validateRequest } from '../../validation/validateRequest';

const router = Router();
const logger = createLogger('onboardingRouter');

// Persist onboarding state to data/onboarding.json so it survives server restarts.
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'onboarding.json');

interface OnboardingState {
  completed: boolean;
  step: number;
}

function loadState(): OnboardingState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(raw) as OnboardingState;
    }
  } catch (err) {
    logger.warn('Could not read onboarding state file, using defaults', { error: String(err) });
  }
  return { completed: false, step: 1 };
}

async function saveState(state: OnboardingState): Promise<void> {
  try {
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    await fs.promises.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    logger.warn('Could not persist onboarding state', { error: String(err) });
  }
}

const initial = loadState();
let onboardingCompleted = initial.completed;
let onboardingStep = initial.step;

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
router.get(
  '/status',
  asyncErrorHandler(async (req, res) => {
    try {
      // If already marked complete, return immediately
      if (onboardingCompleted) {
        return res.json(ApiResponse.success({ completed: true, step: 5 }));
      }

      // Auto-detect completion: require BOTH bots AND a configured LLM provider.
      // This prevents marking as "done" when env-var bots exist but no LLM key is set.
      const manager = await BotManager.getInstance();
      const bots = await manager.getAllBots();
      const llmStatus = getLlmDefaultStatus();
      if (bots.length > 0 && llmStatus.configured) {
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
  })
);

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
router.post(
  '/complete',
  validateRequest(EmptyBodySchema),
  asyncErrorHandler(async (_req, res) => {
    onboardingCompleted = true;
    onboardingStep = 5;
    await saveState({ completed: true, step: 5 });
    logger.info('Onboarding marked as completed');
    return res.json(ApiResponse.success({ completed: true, step: 5 }));
  })
);

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
router.post(
  '/reset',
  validateRequest(EmptyBodySchema),
  asyncErrorHandler(async (_req, res) => {
    onboardingCompleted = false;
    onboardingStep = 1;
    await saveState({ completed: false, step: 1 });
    logger.info('Onboarding reset');
    return res.json(ApiResponse.success({ completed: false, step: 1 }));
  })
);

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
router.post(
  '/step',
  validateRequest(OnboardingStepSchema),
  asyncErrorHandler(async (req, res) => {
    const { step } = req.body;
    onboardingStep = step;
    await saveState({ completed: onboardingCompleted, step: onboardingStep });
    return res.json(ApiResponse.success({ completed: false, step: onboardingStep }));
  })
);

export default router;
