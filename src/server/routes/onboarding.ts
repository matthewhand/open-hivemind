import { Router } from 'express';
import { createLogger } from '../../common/StructuredLogger';
import { BotManager } from '../../managers/BotManager';

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
router.get('/status', async (_req, res) => {
  try {
    // If already marked complete, return immediately
    if (onboardingCompleted) {
      return res.json({ completed: true, step: 5 });
    }

    // Auto-detect completion: if bots exist, onboarding is implicitly done
    const manager = BotManager.getInstance();
    const bots = await manager.getAllBots();
    if (bots.length > 0) {
      onboardingCompleted = true;
      return res.json({ completed: true, step: 5 });
    }

    return res.json({ completed: false, step: onboardingStep });
  } catch (err) {
    logger.error('Failed to get onboarding status', { error: err });
    return res.json({ completed: false, step: 1 });
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
router.post('/complete', (_req, res) => {
  onboardingCompleted = true;
  onboardingStep = 5;
  logger.info('Onboarding marked as completed');
  return res.json({ completed: true, step: 5 });
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
router.post('/reset', (_req, res) => {
  onboardingCompleted = false;
  onboardingStep = 1;
  logger.info('Onboarding reset');
  return res.json({ completed: false, step: 1 });
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
router.post('/step', (req, res) => {
  const { step } = req.body;
  if (typeof step === 'number' && step >= 1 && step <= 5) {
    onboardingStep = step;
    return res.json({ completed: false, step: onboardingStep });
  }
  return res.status(400).json({ error: 'Invalid step number (must be 1-5)' });
});

export default router;
