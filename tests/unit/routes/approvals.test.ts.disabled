import request from 'supertest';
import express from 'express';
import { DatabaseManager } from '../../../src/database/DatabaseManager';
import approvalsRouter from '../../../src/server/routes/approvals';
import { AuditLog } from '../../../src/database/DatabaseManager';

// Mock the DatabaseManager singleton
jest.mock('../../../src/database/DatabaseManager', () => {
  const mockInstance = {
    isConnected: jest.fn().mockReturnValue(true),
    createApprovalRequest: jest.fn(),
    getPendingApprovalRequests: jest.fn(),
    getApprovalRequest: jest.fn(),
    updateApprovalRequestStatus: jest.fn(),
    createAuditLog: jest.fn(),
  };
  
  return {
    DatabaseManager: {
      getInstance: jest.fn(() => mockInstance)
    }
  };
});

describe('Approvals Router', () => {
  let app: express.Express;
  let mockDbManager: any;
  let approvalsRouter: any;
  
   beforeAll(async () => {
     // Mock auth middleware
     jest.doMock('../../../src/server/middleware/auth', () => ({
       requirePermission: jest.fn((permission) => (req: any, res: any, next: any) => {
         const testUser = req.headers['x-test-user'] || 'testuser';
         req.user = { username: testUser, permissions: ['*'] }; // grant all permissions
         next();
       })
     }));
 
     // Mock DatabaseManager
     jest.doMock('../../../src/database/DatabaseManager', () => {
       const mockInstance = {
         isConnected: jest.fn().mockReturnValue(true),
         createApprovalRequest: jest.fn(),
         getPendingApprovalRequests: jest.fn(),
         getApprovalRequest: jest.fn(),
         updateApprovalRequestStatus: jest.fn(),
         createAuditLog: jest.fn(),
       };
 
       return {
         DatabaseManager: {
           getInstance: jest.fn(() => mockInstance)
         }
       };
     });
 
     // Dynamic import after mocks
     const approvalsModule = await import('../../../src/server/routes/approvals');
     approvalsRouter = approvalsModule.default;
 
     mockDbManager = require('../../../src/database/DatabaseManager').DatabaseManager.getInstance();
 
     app = express();
     app.use(express.json());
     app.use('/approvals', approvalsRouter);
   });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /approvals', () => {
    it('should create approval request successfully with assignees', async () => {
      const requestData = {
        resourceType: 'BotConfiguration',
        resourceId: '123',
        changeType: 'UPDATE',
        requestedBy: 'user1',
        diff: 'config changes',
        assignees: ['user2', 'user3']
      };

      mockDbManager.createApprovalRequest.mockResolvedValue(1);
      mockDbManager.createAuditLog.mockResolvedValue(1);

      const response = await request(app)
        .post('/approvals')
        .set('x-test-user', 'user1')
        .send(requestData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        approvalRequestId: 1,
        message: 'Approval request created successfully'
      });

      expect(mockDbManager.createApprovalRequest).toHaveBeenCalledWith({
        resourceType: 'BotConfiguration',
        resourceId: 123,
        changeType: 'UPDATE',
        requestedBy: 'user1',
        diff: 'config changes',
        assignees: ['user2', 'user3']
      });

      expect(mockDbManager.createAuditLog).toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/approvals')
        .set('x-test-user', 'testuser')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Missing required fields: resourceType, resourceId, changeType, requestedBy'
      });
    });

    it('should return 403 when creating request for another user', async () => {
      const requestData = {
        resourceType: 'BotConfiguration',
        resourceId: '123',
        changeType: 'UPDATE',
        requestedBy: 'another_user',
        diff: 'config changes'
      };

      const response = await request(app)
        .post('/approvals')
        .set('x-test-user', 'testuser')
        .send(requestData)
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        message: 'Cannot create approval request for another user'
      });
    });

    it('should create audit log on successful creation', async () => {
      const requestData = {
        resourceType: 'BotConfiguration',
        resourceId: '123',
        changeType: 'UPDATE',
        requestedBy: 'user1',
        diff: 'config changes'
      };

      mockDbManager.createApprovalRequest.mockResolvedValue(1);

      await request(app)
        .post('/approvals')
        .set('x-test-user', 'user1')
        .send(requestData)
        .expect(201);

      expect(mockDbManager.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'create_approval_request',
        resourceType: 'BotConfiguration',
        details: expect.stringContaining('Change type: UPDATE')
      }));
    });
  });

  describe('PUT /approvals/:id', () => {
    it('should approve request successfully by assigned user', async () => {
      mockDbManager.getApprovalRequest.mockResolvedValue({
        id: 1,
        resourceType: 'BotConfiguration',
        resourceId: 123,
        changeType: 'UPDATE',
        requestedBy: 'user1',
        status: 'pending',
        assignees: ['user2']
      } as any);

      mockDbManager.updateApprovalRequestStatus.mockResolvedValue();

      const response = await request(app)
        .put('/approvals/1')
        .set('x-test-user', 'user2')
        .send({ status: 'approved', comments: 'Looks good' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Approval request approved successfully'
      });

      expect(mockDbManager.updateApprovalRequestStatus).toHaveBeenCalledWith(
        1, 'approved', 'user2', 'Looks good'
      );
    });

    it('should return 403 when non-assigned user tries to approve', async () => {
      mockDbManager.getApprovalRequest.mockResolvedValue({
        id: 1,
        resourceType: 'BotConfiguration',
        resourceId: 123,
        changeType: 'UPDATE',
        requestedBy: 'user1',
        status: 'pending',
        assignees: ['user3'] // Current user is not in assignees
      } as any);

      const response = await request(app)
        .put('/approvals/1')
        .set('x-test-user', 'user2')
        .send({ status: 'approved' })
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        message: 'Only assigned users can approve or reject this request'
      });
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put('/approvals/1')
        .set('x-test-user', 'user2')
        .send({ status: 'invalid' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Status must be either "approved" or "rejected"'
      });
    });

    it('should create audit log on approval', async () => {
      mockDbManager.getApprovalRequest.mockResolvedValue({
        id: 1,
        resourceType: 'BotConfiguration',
        resourceId: 123,
        changeType: 'UPDATE',
        requestedBy: 'user1',
        status: 'pending',
        assignees: ['user2']
      } as any);

      mockDbManager.updateApprovalRequestStatus.mockResolvedValue();

      await request(app)
        .put('/approvals/1')
        .set('x-test-user', 'user2')
        .send({ status: 'approved', comments: 'Approved' })
        .expect(200);

      expect(mockDbManager.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'approval_request_approved',
        details: expect.stringContaining('Approval request approved')
      }));
    });
  });

  describe('GET /approvals/pending', () => {
    it('should return pending approval requests with assignees', async () => {
      const mockRequests = [
        {
          id: 1,
          resourceType: 'BotConfiguration',
          resourceId: 123,
          changeType: 'UPDATE',
          requestedBy: 'user1',
          status: 'pending',
          assignees: ['user2', 'user3']
        },
        {
          id: 2,
          resourceType: 'User',
          resourceId: 456,
          changeType: 'CREATE',
          requestedBy: 'user4',
          status: 'pending',
          assignees: ['user5']
        }
      ];

      mockDbManager.getPendingApprovalRequests.mockResolvedValue(mockRequests as any);

      const response = await request(app)
        .get('/approvals/pending')
        .set('x-test-user', 'testuser')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        approvalRequests: mockRequests,
        count: mockRequests.length
      });
    });

    it('should handle database errors', async () => {
      mockDbManager.getPendingApprovalRequests.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/approvals/pending')
        .set('x-test-user', 'testuser')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to get pending approval requests',
        error: 'DB error'
      });
    });
  });

  describe('GET /approvals/:id', () => {
    it('should return approval request with assignees', async () => {
      const mockRequest = {
        id: 1,
        resourceType: 'BotConfiguration',
        resourceId: 123,
        changeType: 'UPDATE',
        requestedBy: 'user1',
        status: 'pending',
        assignees: ['user2', 'user3']
      };

      mockDbManager.getApprovalRequest.mockResolvedValue(mockRequest as any);

      const response = await request(app)
        .get('/approvals/1')
        .set('x-test-user', 'testuser')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        approvalRequest: mockRequest
      });
    });

    it('should return 404 for non-existent request', async () => {
      mockDbManager.getApprovalRequest.mockResolvedValue(null);

      const response = await request(app)
        .get('/approvals/999')
        .set('x-test-user', 'user1')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Approval request not found'
      });
    });
  });
});