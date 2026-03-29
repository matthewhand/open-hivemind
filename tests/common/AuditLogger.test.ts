import fs from 'fs';
import path from 'path';
import { AuditEvent, AuditLogger } from '../../src/common/auditLogger';

describe('AuditLogger', () => {
  const tmpDir = path.join(__dirname, 'tmp_audit_test');
  let logger: AuditLogger;

  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    process.env.NODE_CONFIG_DIR = tmpDir;
  });

  afterAll(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Reset singleton
    (AuditLogger as any).instance = undefined;

    // Clean up log file
    const logFile = path.join(tmpDir, 'audit.log');
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
    // Clean up rotated files
    for (let i = 1; i <= 5; i++) {
      const rotatedFile = `${logFile}.${i}`;
      if (fs.existsSync(rotatedFile)) {
        fs.unlinkSync(rotatedFile);
      }
    }

    logger = AuditLogger.getInstance();
    (logger as any).logFilePath = path.join(tmpDir, 'audit.log');
  });

  it('should log an event', async () => {
    const event = {
      user: 'test_user',
      action: 'TEST_ACTION',
      resource: 'test_resource',
      result: 'success' as const,
      details: 'test details',
    };

    logger.log(event);

    await logger.waitForQueueDrain();

    const content = fs.readFileSync(logger.getLogFilePath(), 'utf8');
    const loggedEvent = JSON.parse(content.trim()) as AuditEvent;

    expect(loggedEvent).toMatchObject(event);
    expect(loggedEvent.id).toBeDefined();
    expect(loggedEvent.timestamp).toBeDefined();
  });

  it('should rotate logs when size limit is exceeded', async () => {
    // Override maxLogSize for testing
    (logger as any).maxLogSize = 100; // Small size to trigger rotation

    const event = {
      user: 'test_user',
      action: 'TEST_ACTION',
      resource: 'test_resource',
      result: 'success' as const,
      details: 'A'.repeat(50),
    };

    logger.log(event);
    await logger.waitForQueueDrain();
    expect(fs.existsSync(logger.getLogFilePath())).toBe(true);

    // Log again
    logger.log(event);
    logger.log(event);

    await logger.waitForQueueDrain();

    // Check if rotation happened (maybe not yet if size wasn't exceeded perfectly)
    // Force write large file

    fs.writeFileSync(logger.getLogFilePath(), 'A'.repeat(200));
    logger.log(event);

    await logger.waitForQueueDrain();

    const rotatedFile = `${logger.getLogFilePath()}.1`;
    expect(fs.existsSync(rotatedFile)).toBe(true);
  });

  describe('Async Stream Reader Methods', () => {
    beforeEach(async () => {
      // Populate with 15 events
      for (let i = 0; i < 15; i++) {
        logger.log({
          user: i % 2 === 0 ? 'userA' : 'userB',
          action: i % 3 === 0 ? 'ACTION_X' : 'ACTION_Y',
          resource: `res_${i}`,
          result: 'success',
          details: `detail_${i}`,
          metadata: { botId: i % 4 === 0 ? 'bot1' : 'bot2' },
        });
      }
      await logger.waitForQueueDrain();
    });

    it('should getAuditEvents with limit and offset', async () => {
      const events = await logger.getAuditEvents(5, 0);
      expect(events).toHaveLength(5);
      // Newest should be i=14
      expect(events[0].resource).toBe('res_14');
      expect(events[4].resource).toBe('res_10');

      const offsetEvents = await logger.getAuditEvents(5, 5);
      expect(offsetEvents).toHaveLength(5);
      // Offset skips newest 5, next newest is i=9
      expect(offsetEvents[0].resource).toBe('res_9');
    });

    it('should getAuditEventsByUser', async () => {
      const events = await logger.getAuditEventsByUser('userA', 10);
      expect(events.every((e) => e.user === 'userA')).toBe(true);
      // userA are even numbers: 14, 12, 10
      expect(events[0].resource).toBe('res_14');
    });

    it('should getAuditEventsByAction', async () => {
      const events = await logger.getAuditEventsByAction('ACTION_X', 10);
      expect(events.every((e) => e.action === 'ACTION_X')).toBe(true);
      // ACTION_X are multiples of 3: 12, 9, 6
      expect(events[0].resource).toBe('res_12');
    });

    it('should getBotActivity', async () => {
      const events = await logger.getBotActivity('bot1', 10);
      expect(events.every((e) => e.metadata?.botId === 'bot1')).toBe(true);
      // bot1 are multiples of 4: 12, 8, 4, 0
      expect(events[0].resource).toBe('res_12');
    });
  });
});
