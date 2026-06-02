import fs from 'fs';
import { AuditLogger } from '../../../src/common/auditLogger';

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  createReadStream: jest.fn(),
  appendFile: jest.fn(),
  promises: {
    access: jest.fn().mockResolvedValue(undefined),
    appendFile: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ size: 0 }),
    rename: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
  }
}));

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = AuditLogger.getInstance();
  });

  it('should be a singleton', () => {
    const instance1 = AuditLogger.getInstance();
    const instance2 = AuditLogger.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should log an event and queue it', async () => {
    const fsPromises = require('fs').promises;

    logger.log({
      user: 'test-user',
      action: 'TEST_ACTION',
      resource: 'test-resource',
      result: 'success',
      details: 'test details',
    });

    await logger.waitForQueueDrain();
    expect(fsPromises.appendFile).toHaveBeenCalled();
  });
});
