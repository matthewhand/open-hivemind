import fs from 'fs';
import path from 'path';
import { AuditLogger, AuditEvent } from '../../src/common/auditLogger';

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
});
