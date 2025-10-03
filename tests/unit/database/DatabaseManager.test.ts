import { DatabaseManager, DatabaseConfig } from '../../../src/database/DatabaseManager';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Helper function to create a test database
async function createTestDatabase(): Promise<any> {
  const dbPath = path.join(__dirname, 'test-db.sqlite');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create tables
  await db.exec(`
    CREATE TABLE audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      resourceType TEXT,
      resourceId TEXT,
      userId TEXT,
      details TEXT,
      ipAddress TEXT,
      userAgent TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE approval_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resourceType TEXT NOT NULL,
      resourceId INTEGER NOT NULL,
      changeType TEXT NOT NULL,
      requestedBy TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      assignees TEXT,
      diff TEXT,
      approvedBy TEXT,
      comments TEXT,
      approvedAt DATETIME
    );
  `);

  return db;
}

describe('DatabaseManager', () => {
  let manager: DatabaseManager;
  let testDb: any;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    const config: DatabaseConfig = {
      type: 'sqlite',
      path: ':memory:'
    };
    manager = DatabaseManager.getInstance(config);
    // @ts-ignore - override for testing
    manager.db = testDb;
    // Instead of setting private property, call connect() which sets connected flag
    await manager.connect();
  });

  afterAll(async () => {
    await testDb.close();
    const dbPath = path.join(__dirname, 'test-db.sqlite');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  beforeEach(async () => {
    await testDb.exec('DELETE FROM audit_logs');
    await testDb.exec('DELETE FROM approval_requests');
  });

  describe('AuditLog Methods', () => {
    describe('createAuditLog', () => {
      it('should create an audit log with valid inputs', async () => {
        const logData = {
          action: 'CREATE',
          resourceType: 'BotConfiguration',
          resourceId: 123,
          userId: 'user1',
          details: JSON.stringify({ change: 'new value' }),
          ipAddress: '192.168.1.1',
          userAgent: 'TestAgent'
        } as any;
        
        const id = await manager.createAuditLog(logData);
        expect(id).toBeGreaterThan(0);
        
        // Verify by fetching through the manager method
        const logs = await manager.getAuditLogs(logData.userId, logData.action);
        const createdLog = logs.find(l => l.id === id);
        expect(createdLog).toMatchObject({
          action: logData.action,
          resourceType: logData.resourceType,
          resourceId: String(logData.resourceId),
          userId: logData.userId,
          details: logData.details,
          ipAddress: logData.ipAddress,
          userAgent: logData.userAgent
        });
      });

      it('should throw error when database is disconnected', async () => {
        // @ts-ignore - simulate disconnected state
        manager.db = null;
        await expect(manager.createAuditLog({
          action: 'TEST',
          resourceType: 'Test',
          resourceId: 1,
          userId: 'test'
        } as any)).rejects.toThrow('Database not connected');
        // @ts-ignore - restore connection
        manager.db = testDb;
      });
    });

    describe('getAuditLogs', () => {
      beforeEach(async () => {
        // Insert test data with proper timestamps and resourceIds
        // Insert test data
        await testDb.run(
          'INSERT INTO audit_logs (action, resourceType, resourceId, userId, details, ipAddress, userAgent, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ['CREATE', 'Bot', 1, 'user1', JSON.stringify({event: 'create'}), '192.168.1.1', 'TestAgent', new Date(Date.now() - 7200000).toISOString()]
        );
        await testDb.run(
          'INSERT INTO audit_logs (action, resourceType, resourceId, userId, details, ipAddress, userAgent, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ['UPDATE', 'Bot', 2, 'user2', JSON.stringify({change: 'update'}), '192.168.1.2', 'TestAgent', new Date(Date.now() - 3600000).toISOString()]
        );
        await testDb.run(
          'INSERT INTO audit_logs (action, resourceType, resourceId, userId, details, ipAddress, userAgent, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ['DELETE', 'Bot', 3, 'user3', JSON.stringify({reason: 'cleanup'}), '192.168.1.3', 'TestAgent', new Date().toISOString()]
        );
      });

      it('should return recent logs with no filters', async () => {
        const logs = await manager.getAuditLogs();
        expect(logs).toHaveLength(3);
        // Should be ordered by created_at DESC
        expect(logs[0].action).toBe('DELETE');
        expect(logs[2].action).toBe('CREATE');
        logs.forEach((log: any) => {
          expect(log.createdAt instanceof Date).toBe(true);
        });
      });

      it('should filter by userId', async () => {
        const logs = await manager.getAuditLogs('user2');
        expect(logs).toHaveLength(1);
        expect(logs[0].userId).toBe('user2');
      });

      it('should filter by action', async () => {
        const logs = await manager.getAuditLogs(undefined, 'CREATE');
        expect(logs).toHaveLength(1);
        expect(logs[0].action).toBe('CREATE');
      });

      it('should handle combined filters', async () => {
        const logs = await manager.getAuditLogs('user1', 'CREATE');
        expect(logs).toHaveLength(1);
        expect(logs[0].userId).toBe('user1');
        expect(logs[0].action).toBe('CREATE');
      });

      it('should respect limit', async () => {
        const logs = await manager.getAuditLogs(undefined, undefined, 2);
        expect(logs).toHaveLength(2);
      });

      it('should return empty array when no matches', async () => {
        const logs = await manager.getAuditLogs('nonexistent');
        expect(logs).toHaveLength(0);
      });

      it('should parse dates correctly', async () => {
        const logs = await manager.getAuditLogs('user1');
        expect(logs[0].createdAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('ApprovalRequest Methods', () => {
    describe('createApprovalRequest', () => {
      it('should create request with assignees', async () => {
        const requestData = {
          resourceType: 'BotConfiguration',
          resourceId: 123,
          changeType: 'UPDATE',
          requestedBy: 'user1',
          diff: 'config changes',
          assignees: ['user2', 'user3']
        } as any;
        
        const id = await manager.createApprovalRequest(requestData);
        expect(id).toBeGreaterThan(0);
        
        const request = await testDb.get('SELECT * FROM approval_requests WHERE id = ?', [id]);
        expect(request).toMatchObject({
          resourceType: 'BotConfiguration',
          resourceId: 123,
          changeType: 'UPDATE',
          requestedBy: 'user1',
          status: 'pending',
          diff: 'config changes'
        });
        expect(JSON.parse(request.assignees)).toEqual(['user2', 'user3']);
      });

      it('should create request without assignees', async () => {
        const requestData = {
          resourceType: 'BotConfiguration',
          resourceId: 123,
          changeType: 'UPDATE',
          requestedBy: 'user1',
          diff: 'config changes'
        } as any;
        
        const id = await manager.createApprovalRequest(requestData);
        expect(id).toBeGreaterThan(0);
        
        const request = await testDb.get('SELECT * FROM approval_requests WHERE id = ?', [id]);
        expect(request.assignees).toBeNull();
      });
    });

    describe('getApprovalRequest', () => {
      it('should parse assignees from JSON', async () => {
        const requestData = {
          resourceType: 'BotConfiguration',
          resourceId: 123,
          changeType: 'UPDATE',
          requestedBy: 'user1',
          diff: 'config changes',
          assignees: ['user2', 'user3']
        } as any;
        
        const id = await manager.createApprovalRequest(requestData);
        const request = await manager.getApprovalRequest(id);
        
        expect(request).toMatchObject({
          id,
          resourceType: 'BotConfiguration',
          resourceId: 123,
          changeType: 'UPDATE',
          requestedBy: 'user1',
          status: 'pending',
          diff: 'config changes',
          assignees: ['user2', 'user3']
        });
      });

      it('should handle null assignees', async () => {
        const requestData = {
          resourceType: 'BotConfiguration',
          resourceId: 123,
          changeType: 'UPDATE',
          requestedBy: 'user1',
          diff: 'config changes'
        } as any;
        
        const id = await manager.createApprovalRequest(requestData);
        const request = await manager.getApprovalRequest(id);
        
        expect(request).toMatchObject({
          id,
          resourceType: 'BotConfiguration',
          resourceId: 123,
          changeType: 'UPDATE',
          requestedBy: 'user1',
          status: 'pending',
          diff: 'config changes'
        });
        expect(request?.assignees).toBeNull();
      });

      it('should return null for non-existent request', async () => {
        const request = await manager.getApprovalRequest(999);
        expect(request).toBeNull();
      });
    });

    describe('updateApprovalRequestStatus', () => {
      it('should update status and create audit log', async () => {
        const requestData = {
          resourceType: 'BotConfiguration',
          resourceId: 123,
          changeType: 'UPDATE',
          requestedBy: 'user1',
          diff: 'config changes'
        } as any;
        
        const id = await manager.createApprovalRequest(requestData);
        await manager.updateApprovalRequestStatus(
          id,
          'approved',
          'admin123',
          'Approved by admin',
          '192.168.1.100',
          'TestAgent'
        );
        
        const updatedRequest = await manager.getApprovalRequest(id);
        expect(updatedRequest).toMatchObject({
          status: 'approved',
          approvedBy: 'admin123',
          comments: 'Approved by admin'
        });
        expect(updatedRequest!.approvedAt).not.toBeNull();
        const approvedAt = updatedRequest!.approvedAt!;
        const approvedDate = new Date(approvedAt);
        expect(approvedDate).toBeInstanceOf(Date);
        expect(isNaN(approvedDate.getTime())).toBe(false);
        
        // Verify audit log was created
        const auditLogs = await testDb.all('SELECT * FROM audit_logs WHERE resourceType = ? AND resourceId = ?', ['ApprovalRequest', id]);
        expect(auditLogs).toHaveLength(1);
        expect(auditLogs[0]).toMatchObject({
          action: 'APPROVE',
          resourceType: 'ApprovalRequest',
          resourceId: String(id),
          userId: 'admin123',
          ipAddress: '192.168.1.100',
          userAgent: 'TestAgent'
        });
        const details = JSON.parse(auditLogs[0].details);
        expect(details).toEqual({
          comments: 'Approved by admin',
          status: 'approved'
        });
      });
    });
  });
});