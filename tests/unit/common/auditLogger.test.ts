import fs from 'fs';
import path from 'path';
import { AuditLogger } from '../../../src/common/auditLogger';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  createReadStream: jest.fn(),
  appendFile: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  access: jest.fn(),
  appendFile: jest.fn(),
  stat: jest.fn(),
  rename: jest.fn(),
  unlink: jest.fn(),
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
    const fsPromises = require('fs/promises');
    fsPromises.appendFile.mockResolvedValue(undefined);

    logger.log({
      user: 'test-user',
      action: 'TEST_ACTION',
      resource: 'test-resource',
      result: 'success',
      details: 'test details',
    });

    await logger.waitForQueueDrain();
    expect(fsPromises.appendFile).toHaveBeenCalled();
    const callArg = fsPromises.appendFile.mock.calls[0][1];
    expect(callArg).toContain('test-user');
    expect(callArg).toContain('TEST_ACTION');
  });

  it('should have helper methods for different log types', async () => {
    const fsPromises = require('fs/promises');
    fsPromises.appendFile.mockResolvedValue(undefined);

    logger.logConfigChange('admin', 'UPDATE', 'config.json', 'success', 'changed port');
    logger.logBotAction('admin', 'START', 'my-bot', 'success', 'bot started');
    logger.logAdminAction('admin', 'LOGIN', 'auth', 'success', 'user logged in');

    await logger.waitForQueueDrain();
    expect(fsPromises.appendFile).toHaveBeenCalledTimes(3);
  });
});
