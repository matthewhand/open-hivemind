import express, { Request, Response, NextFunction } from 'express';
import Debug from 'debug';
import { DatabaseManager } from '../../database/DatabaseManager';
import { requireRole } from '../middleware/auth';
import { UserRole } from '../../auth/types';

const debug = Debug('app:approvals');
const router = express.Router();

// Get all pending approval requests
router.get('/pending', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const pendingRequests = await dbManager.getPendingApprovalRequests();
    res.json({
      success: true,
      approvalRequests: pendingRequests,
      count: pendingRequests.length
    });
  } catch (error) {
    debug('Error getting pending approval requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending approval requests',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get a specific approval request
router.get('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestId = parseInt(id, 10);

    if (isNaN(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid approval request ID'
      });
    }

    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const request = await dbManager.getApprovalRequest(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    res.json({
      success: true,
      approvalRequest: request
    });
  } catch (error) {
    debug('Error getting approval request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get approval request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new approval request
router.post('/', requireRole('user'), async (req: Request, res: Response) => {
  try {
    const { resourceType, resourceId, changeType, requestedBy, diff } = req.body;

    // Validate required fields
    if (!resourceType || !resourceId || !changeType || !requestedBy) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: resourceType, resourceId, changeType, requestedBy'
      });
    }

    // Validate resource type
    const validResourceTypes: Array<'BotConfiguration' | 'User'> = ['BotConfiguration', 'User'];
    if (!validResourceTypes.includes(resourceType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid resourceType. Must be one of: ${validResourceTypes.join(', ')}`
      });
    }

    // Validate change type
    const validChangeTypes: Array<'CREATE' | 'UPDATE' | 'DELETE'> = ['CREATE', 'UPDATE', 'DELETE'];
    if (!validChangeTypes.includes(changeType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid changeType. Must be one of: ${validChangeTypes.join(', ')}`
      });
    }

    // Validate that the user making the request matches the requestedBy field
    if (req.user?.username !== requestedBy) {
      return res.status(403).json({
        success: false,
        message: 'Cannot create approval request for another user'
      });
    }

    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    // Create the approval request
    const requestId = await dbManager.createApprovalRequest({
      resourceType,
      resourceId: parseInt(resourceId, 10),
      changeType,
      requestedBy,
      diff
    });

    res.status(201).json({
      success: true,
      approvalRequestId: requestId,
      message: 'Approval request created successfully'
    });
  } catch (error) {
    debug('Error creating approval request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create approval request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update approval request status (approve/reject)
router.put('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;
    const approvedBy = req.user?.username;

    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid approval request ID'
      });
    }

    // Validate status
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"'
      });
    }

    if (!approvedBy) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    // Get the existing request to check if it's already approved/rejected
    const existingRequest = await dbManager.getApprovalRequest(requestId);
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    if (existingRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Approval request is already ${existingRequest.status}`
      });
    }

    // Update the status
    await dbManager.updateApprovalRequestStatus(requestId, status, approvedBy, comments);

    res.json({
      success: true,
      message: `Approval request ${status} successfully`
    });
  } catch (error) {
    debug('Error updating approval request status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update approval request status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;