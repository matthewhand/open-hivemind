import Debug from 'debug';
import { Router } from 'express';
import { PendingActionManager } from '../../../managers/PendingActionManager';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncErrorHandler } from '../../../middleware/errorHandler';

const router = Router();
const debug = Debug('app:webui:admin:approvals');

/**
 * GET /api/admin/pending-actions
 * List all tool executions waiting for approval.
 */
router.get('/pending-actions', asyncErrorHandler(async (req, res) => {
  const pendingMgr = PendingActionManager.getInstance();
  const actions = pendingMgr.getPendingActions();
  return res.json(ApiResponse.success(actions));
}));

/**
 * POST /api/admin/pending-actions/:id/approve
 * Approve a tool execution.
 */
router.post('/pending-actions/:id/approve', asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  const pendingMgr = PendingActionManager.getInstance();
  
  if (!pendingMgr.getAction(id)) {
    return res.status(404).json(ApiResponse.error('Action not found', 'NOT_FOUND'));
  }

  pendingMgr.resolveAction(id, true);
  debug(`Admin approved action: ${id}`);
  
  return res.json(ApiResponse.success({ id, status: 'approved' }));
}));

/**
 * POST /api/admin/pending-actions/:id/deny
 * Deny a tool execution.
 */
router.post('/pending-actions/:id/deny', asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  const pendingMgr = PendingActionManager.getInstance();
  
  if (!pendingMgr.getAction(id)) {
    return res.status(404).json(ApiResponse.error('Action not found', 'NOT_FOUND'));
  }

  pendingMgr.resolveAction(id, false);
  debug(`Admin denied action: ${id}`);
  
  return res.json(ApiResponse.success({ id, status: 'denied' }));
}));

export default router;
