/**
 * @wip ROADMAP ITEM — NOT ACTIVE
 *
 * This component is part of the Approval Workflow feature planned for future implementation.
 * It has been removed from the active UI navigation and routing.
 *
 * See docs/reference/IMPROVEMENT_ROADMAP.md for implementation prerequisites and planned scope.
 *
 * DO NOT import or route to this component until the backend approval APIs are implemented.
 */

/**
 * Approvals Route - DISABLED
 *
 * This route has been disabled as part of the system refactoring.
 * The approvals functionality is temporarily unavailable.
 *
 * To re-enable: Rename `approvals.ts.disabled` back to `approvals.ts`
 */

import { Router } from 'express';

const router = Router();

// Health check endpoint to indicate disabled status
router.get('/status', (req, res) => {
  res.json({
    status: 'disabled',
    message: 'Approvals functionality is currently disabled',
  });
});

// Mock endpoints to prevent 404s
router.get('*', (req, res) => {
  res.status(503).json({
    error: 'Approvals functionality is disabled',
  });
});

router.post('*', (req, res) => {
  res.status(503).json({
    error: 'Approvals functionality is disabled',
  });
});

export default router;
