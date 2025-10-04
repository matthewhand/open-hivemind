import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';

// Define minimal ApprovalRequest type for testing
type ApprovalRequest = {
  id: number;
  resourceType: string;
  resourceId: number;
  changeType: string;
  requestedBy: string;
  status: string;
  requestedAt: Date;
  assignees?: string[];
  approvedBy?: string;
  comments?: string;
  approvedAt?: Date;
  diff?: string;
};

const mockDbInstance = {
  createApprovalRequest: jest.fn(),
  getApprovalRequest: jest.fn(),
  updateApprovalRequestStatus: jest.fn(),
  getPendingApprovalRequests: jest.fn(),
  isConnected: jest.fn().mockReturnValue(true),
  createAuditLog: jest.fn().mockResolvedValue(1),
};

jest.mock('../../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue(mockDbInstance),
  },
}));

// Mock requirePermission middleware to set req.user based on x-test-user header
jest.mock('../../../src/server/middleware/auth', () => ({
  requirePermission: jest.fn((permission) => (req: any, res: any, next: any) => {
    const testUser = req.headers['x-test-user'] || 'testuser';
    req.user = { username: testUser, permissions: ['*'] }; // grant all permissions
    next();
  })
}));

import { DatabaseManager } from '../../../src/database/DatabaseManager';


describe('Approvals Routes', () => {
  let server: express.Express;

  beforeAll(() => {
    server = express();
    server.use(bodyParser.json());
    server.use('/approvals', require('../../../src/server/routes/approvals').default);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbInstance.createApprovalRequest.mockResolvedValue(123);
    mockDbInstance.getApprovalRequest.mockResolvedValue({
      id: 123,
      resourceType: 'BotConfiguration',
      resourceId: 456,
      changeType: 'UPDATE',
      requestedBy: 'testuser',
      status: 'pending',
      requestedAt: new Date(),
      assignees: ['testuser', 'user2']
    });
    mockDbInstance.getPendingApprovalRequests.mockResolvedValue([
      {
        id: 123,
        resourceType: 'BotConfiguration',
        resourceId: 456,
        changeType: 'UPDATE',
        requestedBy: 'testuser',
        status: 'pending',
        requestedAt: new Date(),
        assignees: ['testuser', 'user2']
      }
    ]);
  });

  describe('POST /approvals', () => {
    it('should create approval request with assignees', async () => {
      const response = await request(server)
        .post('/approvals')
        .set('x-test-user', 'testuser')
        .send({
          resourceType: 'BotConfiguration',
          resourceId: 456,
          changeType: 'UPDATE',
          requestedBy: 'testuser',
          diff: 'config changes',
          assignees: ['testuser', 'user2']
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.approvalRequestId).toBe(123);
      expect(mockDbInstance.createApprovalRequest).toHaveBeenCalledWith(expect.objectContaining({
        assignees: ['testuser', 'user2']
      }));
      expect(mockDbInstance.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'create_approval_request'
      }));
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(server)
        .post('/approvals')
        .set('x-test-user', 'testuser')
        .send({
          resourceType: 'BotConfiguration',
          // Missing resourceId
          changeType: 'UPDATE',
          requestedBy: 'testuser'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Missing required fields: resourceType, resourceId, changeType, requestedBy');
      expect(response.body.success).toBe(false);
    });

    it('should create audit log on successful creation', async () => {
      await request(server)
        .post('/approvals')
        .set('x-test-user', 'testuser')
        .send({
          resourceType: 'BotConfiguration',
          resourceId: 456,
          changeType: 'UPDATE',
          requestedBy: 'testuser',
          diff: 'config changes'
        });
      
      expect(mockDbInstance.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create_approval_request',
          userId: 'testuser'
        })
      );
    });
  });

  describe('PUT /approvals/:id', () => {
    it('should approve request by assigned user', async () => {
      const response = await request(server)
        .put('/approvals/123')
        .set('x-test-user', 'testuser')
        .send({
          status: 'approved',
          comments: 'Looks good'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockDbInstance.updateApprovalRequestStatus).toHaveBeenCalledWith(
        123,
        'approved',
        'testuser',
        'Looks good'
      );
      expect(mockDbInstance.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'approval_request_approved'
      }));
    });

    it('should return 403 for non-assigned user', async () => {
      const response = await request(server)
        .put('/approvals/123')
        .set('x-test-user', 'unauthorized_user')
        .send({
          status: 'approved',
          comments: 'Trying to approve'
        });
      
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Only assigned users can approve or reject this request');
    });

    it('should create audit log on status change', async () => {
      await request(server)
        .put('/approvals/123')
        .set('x-test-user', 'testuser')
        .send({
          status: 'approved',
          comments: 'Approved'
        });
      
      expect(mockDbInstance.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'approval_request_approved',
          userId: 'testuser'
        })
      );
    });
  });

  describe('GET /approvals/pending', () => {
    it('should return pending requests with assignees', async () => {
      const response = await request(server)
        .get('/approvals/pending')
        .set('x-test-user', 'testuser');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.approvalRequests)).toBe(true);
      expect(response.body.approvalRequests[0].assignees).toEqual(['testuser', 'user2']);
      expect(response.body.count).toBe(1);
    });
  });

  describe('GET /approvals/:id', () => {
    it('should return request details with assignees', async () => {
      const response = await request(server)
        .get('/approvals/123')
        .set('x-test-user', 'testuser');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.approvalRequest.assignees).toEqual(['testuser', 'user2']);
    });

    it('should return 404 for non-existent request', async () => {
      mockDbInstance.getApprovalRequest.mockResolvedValue(null);
      
      const response = await request(server)
        .get('/approvals/999')
        .set('x-test-user', 'testuser');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Approval request not found');
    });
  });
});