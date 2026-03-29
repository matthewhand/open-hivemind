import { EventEmitter } from 'events';
import { RealTimeNotificationService } from '../../../../src/server/services/RealTimeNotificationService';
import { WebSocketService } from '../../../../src/server/services/WebSocketService';

jest.mock('../../../../src/server/services/WebSocketService');

describe('RealTimeNotificationService', () => {
  let service: RealTimeNotificationService;
  let mockWebSocketService: jest.Mocked<WebSocketService>;

  beforeEach(() => {
    // Reset singleton
    (RealTimeNotificationService as any).instance = null;

    // Mock WebSocketService
    mockWebSocketService = {
      io: {
        sockets: {
          emit: jest.fn(),
        },
      },
    } as any;

    (WebSocketService.getInstance as jest.Mock).mockReturnValue(mockWebSocketService);

    service = RealTimeNotificationService.getInstance();
  });

  afterEach(() => {
    (RealTimeNotificationService as any).instance = null;
  });

  describe('notify', () => {
    test('should create and emit notification with ID and timestamp', () => {
      const notificationId = service.notify({
        type: 'agent',
        severity: 'info',
        title: 'Test Notification',
        message: 'This is a test',
      });

      expect(notificationId).toBeDefined();
      expect(typeof notificationId).toBe('string');
      expect(mockWebSocketService.io?.sockets?.emit).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({
          id: notificationId,
          type: 'agent',
          severity: 'info',
          title: 'Test Notification',
          message: 'This is a test',
          timestamp: expect.any(String),
        })
      );
    });

    test('should store notification in internal array', () => {
      service.notify({
        type: 'system',
        severity: 'error',
        title: 'Error Notification',
        message: 'An error occurred',
      });

      const notifications = service.getNotifications(10);
      expect(notifications.length).toBe(1);
      expect(notifications[0].title).toBe('Error Notification');
    });

    test('should include optional metadata and source', () => {
      service.notify({
        type: 'mcp',
        severity: 'warning',
        title: 'Warning',
        message: 'Test warning',
        source: 'test-source',
        metadata: { key: 'value', count: 42 },
      });

      const notifications = service.getNotifications(1);
      expect(notifications[0].source).toBe('test-source');
      expect(notifications[0].metadata).toEqual({ key: 'value', count: 42 });
    });

    test('should trim notifications when exceeding max size', () => {
      // Add more than maxNotifications (1000)
      for (let i = 0; i < 1050; i++) {
        service.notify({
          type: 'system',
          severity: 'info',
          title: `Notification ${i}`,
          message: `Message ${i}`,
        });
      }

      const notifications = service.getNotifications(2000);
      expect(notifications.length).toBeLessThanOrEqual(1000);
    });

    test('should emit to local event listeners', (done) => {
      service.on('notification', (notification) => {
        expect(notification.title).toBe('Local Event Test');
        done();
      });

      service.notify({
        type: 'agent',
        severity: 'success',
        title: 'Local Event Test',
        message: 'Testing local events',
      });
    });
  });

  describe('getNotifications', () => {
    test('should return limited number of notifications', () => {
      for (let i = 0; i < 20; i++) {
        service.notify({
          type: 'system',
          severity: 'info',
          title: `Notification ${i}`,
          message: `Message ${i}`,
        });
      }

      const notifications = service.getNotifications(5);
      expect(notifications.length).toBe(5);
    });

    test('should filter by type', () => {
      service.notify({ type: 'agent', severity: 'info', title: 'Agent 1', message: 'msg' });
      service.notify({ type: 'mcp', severity: 'info', title: 'MCP 1', message: 'msg' });
      service.notify({ type: 'agent', severity: 'info', title: 'Agent 2', message: 'msg' });

      const filtered = service.getNotifications(10, { types: ['agent'] });
      expect(filtered.length).toBe(2);
      expect(filtered.every((n) => n.type === 'agent')).toBe(true);
    });

    test('should filter by severity', () => {
      service.notify({ type: 'system', severity: 'error', title: 'Error', message: 'msg' });
      service.notify({ type: 'system', severity: 'info', title: 'Info', message: 'msg' });
      service.notify({ type: 'system', severity: 'error', title: 'Error 2', message: 'msg' });

      const filtered = service.getNotifications(10, { severities: ['error'] });
      expect(filtered.length).toBe(2);
      expect(filtered.every((n) => n.severity === 'error')).toBe(true);
    });

    test('should filter by source', () => {
      service.notify({
        type: 'agent',
        severity: 'info',
        title: 'Test',
        message: 'msg',
        source: 'bot-1',
      });
      service.notify({
        type: 'agent',
        severity: 'info',
        title: 'Test',
        message: 'msg',
        source: 'bot-2',
      });
      service.notify({
        type: 'agent',
        severity: 'info',
        title: 'Test',
        message: 'msg',
        source: 'bot-1',
      });

      const filtered = service.getNotifications(10, { sources: ['bot-1'] });
      expect(filtered.length).toBe(2);
      expect(filtered.every((n) => n.source === 'bot-1')).toBe(true);
    });

    test('should apply multiple filters', () => {
      service.notify({
        type: 'agent',
        severity: 'error',
        title: 'Test',
        message: 'msg',
        source: 'bot-1',
      });
      service.notify({
        type: 'agent',
        severity: 'info',
        title: 'Test',
        message: 'msg',
        source: 'bot-1',
      });
      service.notify({
        type: 'mcp',
        severity: 'error',
        title: 'Test',
        message: 'msg',
        source: 'bot-1',
      });

      const filtered = service.getNotifications(10, {
        types: ['agent'],
        severities: ['error'],
        sources: ['bot-1'],
      });
      expect(filtered.length).toBe(1);
    });

    test('should return empty array when no notifications match filter', () => {
      service.notify({ type: 'agent', severity: 'info', title: 'Test', message: 'msg' });

      const filtered = service.getNotifications(10, { types: ['mcp'] });
      expect(filtered.length).toBe(0);
    });
  });

  describe('markAsRead', () => {
    test('should mark notification as read', () => {
      const id = service.notify({
        type: 'system',
        severity: 'info',
        title: 'Test',
        message: 'msg',
        metadata: {},
      });

      const result = service.markAsRead(id);
      expect(result).toBe(true);

      const notifications = service.getNotifications(10);
      expect(notifications[0].metadata?.read).toBe(true);
    });

    test('should return false for non-existent notification', () => {
      const result = service.markAsRead('non-existent-id');
      expect(result).toBe(false);
    });

    test('should return false when notification has no metadata', () => {
      const id = service.notify({
        type: 'system',
        severity: 'info',
        title: 'Test',
        message: 'msg',
      });

      const result = service.markAsRead(id);
      expect(result).toBe(false);
    });
  });

  describe('clearNotifications', () => {
    beforeEach(() => {
      service.notify({ type: 'agent', severity: 'info', title: 'Agent 1', message: 'msg' });
      service.notify({ type: 'mcp', severity: 'error', title: 'MCP 1', message: 'msg' });
      service.notify({ type: 'agent', severity: 'warning', title: 'Agent 2', message: 'msg' });
    });

    test('should clear all notifications when no filter provided', () => {
      const cleared = service.clearNotifications();
      expect(cleared).toBe(3);
      expect(service.getNotifications(10).length).toBe(0);
    });

    test('should clear notifications by type', () => {
      const cleared = service.clearNotifications({ types: ['agent'] });
      expect(cleared).toBe(2);

      const remaining = service.getNotifications(10);
      expect(remaining.length).toBe(1);
      expect(remaining[0].type).toBe('mcp');
    });

    test('should clear notifications by severity', () => {
      const cleared = service.clearNotifications({ severities: ['error'] });
      expect(cleared).toBe(1);

      const remaining = service.getNotifications(10);
      expect(remaining.length).toBe(2);
      expect(remaining.every((n) => n.severity !== 'error')).toBe(true);
    });

    test('should return 0 when no notifications match filter', () => {
      const cleared = service.clearNotifications({ types: ['system'] });
      expect(cleared).toBe(0);
      expect(service.getNotifications(10).length).toBe(3);
    });
  });

  describe('subscribe', () => {
    test('should call callback for all notifications when no filter', (done) => {
      const callback = jest.fn();

      service.subscribe(callback);
      service.notify({ type: 'agent', severity: 'info', title: 'Test', message: 'msg' });

      setTimeout(() => {
        expect(callback).toHaveBeenCalledTimes(1);
        done();
      }, 10);
    });

    test('should filter notifications by type', (done) => {
      const callback = jest.fn();

      service.subscribe(callback, { types: ['agent'] });
      service.notify({ type: 'agent', severity: 'info', title: 'Test', message: 'msg' });
      service.notify({ type: 'mcp', severity: 'info', title: 'Test', message: 'msg' });

      setTimeout(() => {
        expect(callback).toHaveBeenCalledTimes(1);
        done();
      }, 10);
    });

    test('should return unsubscribe function', (done) => {
      const callback = jest.fn();

      const unsubscribe = service.subscribe(callback);
      service.notify({ type: 'agent', severity: 'info', title: 'Test 1', message: 'msg' });

      unsubscribe();
      service.notify({ type: 'agent', severity: 'info', title: 'Test 2', message: 'msg' });

      setTimeout(() => {
        expect(callback).toHaveBeenCalledTimes(1);
        done();
      }, 10);
    });
  });

  describe('convenience methods', () => {
    describe('notifyAgentEvent', () => {
      test('should notify agent started event', () => {
        const id = service.notifyAgentEvent('test-agent', 'started', 'successfully');

        const notifications = service.getNotifications(1);
        expect(notifications[0]).toMatchObject({
          type: 'agent',
          severity: 'success',
          title: 'Agent started',
          message: 'Agent "test-agent" started: successfully',
          source: 'test-agent',
        });
      });

      test('should notify agent error event', () => {
        service.notifyAgentEvent('test-agent', 'error', 'connection failed');

        const notifications = service.getNotifications(1);
        expect(notifications[0].severity).toBe('error');
      });

      test('should include metadata', () => {
        service.notifyAgentEvent('test-agent', 'configured', undefined, { config: 'value' });

        const notifications = service.getNotifications(1);
        expect(notifications[0].metadata).toMatchObject({
          agentName: 'test-agent',
          event: 'configured',
          config: 'value',
        });
      });
    });

    describe('notifyMCPEvent', () => {
      test('should notify MCP connected event', () => {
        service.notifyMCPEvent('mcp-server', 'connected');

        const notifications = service.getNotifications(1);
        expect(notifications[0]).toMatchObject({
          type: 'mcp',
          severity: 'success',
          title: 'MCP Server connected',
          source: 'mcp-server',
        });
      });

      test('should notify MCP error event', () => {
        service.notifyMCPEvent('mcp-server', 'error', 'timeout');

        const notifications = service.getNotifications(1);
        expect(notifications[0].severity).toBe('error');
      });
    });

    describe('notifySystemEvent', () => {
      test('should notify system startup', () => {
        service.notifySystemEvent('startup', 'Application started');

        const notifications = service.getNotifications(1);
        expect(notifications[0]).toMatchObject({
          type: 'system',
          severity: 'success',
          title: 'System startup',
          message: 'Application started',
          source: 'system',
        });
      });

      test('should notify system error', () => {
        service.notifySystemEvent('error', 'Database connection failed');

        const notifications = service.getNotifications(1);
        expect(notifications[0].severity).toBe('error');
      });
    });
  });

  describe('getStats', () => {
    test('should return correct stats', () => {
      service.notify({ type: 'agent', severity: 'info', title: 'Test 1', message: 'msg' });
      service.notify({ type: 'agent', severity: 'error', title: 'Test 2', message: 'msg' });
      service.notify({ type: 'mcp', severity: 'info', title: 'Test 3', message: 'msg' });

      const stats = service.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byType).toEqual({ agent: 2, mcp: 1 });
      expect(stats.bySeverity).toEqual({ info: 2, error: 1 });
      expect(stats.recent.length).toBeLessThanOrEqual(10);
      expect(stats.unread).toBe(3);
    });

    test('should count read notifications correctly', () => {
      const id1 = service.notify({
        type: 'system',
        severity: 'info',
        title: 'Test 1',
        message: 'msg',
        metadata: {},
      });
      service.notify({
        type: 'system',
        severity: 'info',
        title: 'Test 2',
        message: 'msg',
        metadata: {},
      });

      service.markAsRead(id1);

      const stats = service.getStats();
      expect(stats.unread).toBe(1);
    });
  });

  describe('singleton behavior', () => {
    test('should return same instance', () => {
      const instance1 = RealTimeNotificationService.getInstance();
      const instance2 = RealTimeNotificationService.getInstance();

      expect(instance1).toBe(instance2);
    });

    test('should share state across instances', () => {
      const instance1 = RealTimeNotificationService.getInstance();
      instance1.notify({ type: 'agent', severity: 'info', title: 'Test', message: 'msg' });

      const instance2 = RealTimeNotificationService.getInstance();
      const notifications = instance2.getNotifications(10);

      expect(notifications.length).toBeGreaterThan(0);
    });
  });
});
