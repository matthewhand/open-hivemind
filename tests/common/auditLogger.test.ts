import { AuditLogger } from '../../src/common/auditLogger';
import fs from 'fs';
import path from 'path';

describe('AuditLogger', () => {
  const testConfigDir = path.join(__dirname, '../../test-config');
  const testAuditLog = path.join(testConfigDir, 'audit.log');

  beforeEach(() => {
    // Clean up any existing test files
    if (fs.existsSync(testAuditLog)) {
      fs.unlinkSync(testAuditLog);
    }
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testConfigDir, { recursive: true });

    // Mock the config directory for testing
    process.env.NODE_CONFIG_DIR = testConfigDir;

    // Reset singleton instance
    (AuditLogger as any).instance = null;
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testAuditLog)) {
      fs.unlinkSync(testAuditLog);
    }
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
    delete process.env.NODE_CONFIG_DIR;
    (AuditLogger as any).instance = null;
  });

  test('should create audit log file and log events', () => {
    const auditLogger = AuditLogger.getInstance();

    auditLogger.log({
      user: 'test-user',
      action: 'TEST_ACTION',
      resource: 'test-resource',
      result: 'success',
      details: 'Test audit event'
    });

    expect(fs.existsSync(testAuditLog)).toBe(true);

    const logContent = fs.readFileSync(testAuditLog, 'utf8');
    const logEntry = JSON.parse(logContent.trim());

    expect(logEntry.user).toBe('test-user');
    expect(logEntry.action).toBe('TEST_ACTION');
    expect(logEntry.resource).toBe('test-resource');
    expect(logEntry.result).toBe('success');
    expect(logEntry.details).toBe('Test audit event');
    expect(logEntry.timestamp).toBeDefined();
    expect(logEntry.id).toBeDefined();
  });

  test('should log configuration changes', () => {
    const auditLogger = AuditLogger.getInstance();

    auditLogger.logConfigChange(
      'admin-user',
      'UPDATE',
      'config/bot1',
      'success',
      'Updated bot configuration',
      {
        oldValue: { name: 'old-name' },
        newValue: { name: 'new-name' }
      }
    );

    const events = auditLogger.getAuditEvents();
    expect(events.length).toBe(1);
    expect(events[0].user).toBe('admin-user');
    expect(events[0].action).toBe('CONFIG_UPDATE');
    expect(events[0].resource).toBe('config/bot1');
    expect(events[0].oldValue).toEqual({ name: 'old-name' });
    expect(events[0].newValue).toEqual({ name: 'new-name' });
  });

  test('should log bot actions', () => {
    const auditLogger = AuditLogger.getInstance();

    auditLogger.logBotAction(
      'user1',
      'CREATE',
      'my-bot',
      'success',
      'Created new bot instance'
    );

    const events = auditLogger.getAuditEvents();
    expect(events.length).toBe(1);
    expect(events[0].user).toBe('user1');
    expect(events[0].action).toBe('BOT_CREATE');
    expect(events[0].resource).toBe('bots/my-bot');
  });

  test('should retrieve audit events with pagination', () => {
    const auditLogger = AuditLogger.getInstance();

    // Log multiple events with slight delays to ensure consistent ordering
    for (let i = 0; i < 5; i++) {
      auditLogger.log({
        user: `user${i}`,
        action: 'TEST',
        resource: `resource${i}`,
        result: 'success',
        details: `Test event ${i}`
      });
      // Small delay to ensure different timestamps
      jest.advanceTimersByTime(1);
    }

    const allEvents = auditLogger.getAuditEvents();
    expect(allEvents.length).toBe(5);

    const limitedEvents = auditLogger.getAuditEvents(3);
    expect(limitedEvents.length).toBe(3);

    const paginatedEvents = auditLogger.getAuditEvents(2, 2);
    expect(paginatedEvents.length).toBe(2);
    expect(paginatedEvents[0].user).toBe('user2');
  });

  test('should filter events by user', () => {
    const auditLogger = AuditLogger.getInstance();

    auditLogger.log({
      user: 'user1',
      action: 'ACTION1',
      resource: 'resource1',
      result: 'success',
      details: 'Event 1'
    });

    auditLogger.log({
      user: 'user2',
      action: 'ACTION2',
      resource: 'resource2',
      result: 'success',
      details: 'Event 2'
    });

    const user1Events = auditLogger.getAuditEventsByUser('user1');
    expect(user1Events.length).toBe(1);
    expect(user1Events[0].user).toBe('user1');

    const user2Events = auditLogger.getAuditEventsByUser('user2');
    expect(user2Events.length).toBe(1);
    expect(user2Events[0].user).toBe('user2');
  });

  test('should filter events by action', () => {
    const auditLogger = AuditLogger.getInstance();

    auditLogger.log({
      user: 'user1',
      action: 'CREATE',
      resource: 'resource1',
      result: 'success',
      details: 'Create event'
    });

    auditLogger.log({
      user: 'user1',
      action: 'UPDATE',
      resource: 'resource1',
      result: 'success',
      details: 'Update event'
    });

    const createEvents = auditLogger.getAuditEventsByAction('CREATE');
    expect(createEvents.length).toBe(1);
    expect(createEvents[0].action).toBe('CREATE');

    const updateEvents = auditLogger.getAuditEventsByAction('UPDATE');
    expect(updateEvents.length).toBe(1);
    expect(updateEvents[0].action).toBe('UPDATE');
  });
});