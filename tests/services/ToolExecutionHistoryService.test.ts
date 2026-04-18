import fs from 'fs';
import path from 'path';
import {
  ToolExecutionHistoryService,
  type ToolExecutionRecord,
} from '../../src/server/services/ToolExecutionHistoryService';

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    appendFile: jest.fn((_file, _data, _opts, cb) => cb(null)),
    promises: {
      ...actualFs.promises,
      mkdir: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
      access: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockResolvedValue(''),
    },
  };
});

describe('ToolExecutionHistoryService (Robust)', () => {
  let service: ToolExecutionHistoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (ToolExecutionHistoryService as any).instance = undefined;
    service = ToolExecutionHistoryService.getInstance();
  });

  const record: ToolExecutionRecord = {
    id: 'test-1',
    serverName: 'weather',
    toolName: 'get_forecast',
    arguments: { city: 'London' },
    result: { forecast: 'sunny' },
    status: 'success',
    executedAt: new Date().toISOString(),
    duration: 150,
  };

  it('should be a singleton', () => {
    const s2 = ToolExecutionHistoryService.getInstance();
    expect(service).toBe(s2);
  });

  it('should create the data directory if it does not exist', async () => {
    await service.logExecution(record);
    expect(fs.promises.mkdir).toHaveBeenCalledWith(expect.stringContaining('data'), {
      recursive: true,
    });
  });

  it('should append tool executions to the log file', async () => {
    await service.logExecution(record);
    expect(fs.appendFile).toHaveBeenCalledWith(
      expect.stringContaining('tool-execution-history.jsonl'),
      JSON.stringify(record) + '\n',
      'utf8',
      expect.any(Function)
    );
  });

  it('should handle file append errors', async () => {
    (fs.appendFile as unknown as jest.Mock).mockImplementationOnce((_f, _d, _o, cb) =>
      cb(new Error('Disk Full'))
    );

    await expect(service.logExecution(record)).rejects.toThrow('Disk Full');
  });

  it('should apply retention policy when logging', async () => {
    // Spy on applyRetentionPolicy (private method)
    const spy = jest.spyOn(service as any, 'applyRetentionPolicy');

    await service.logExecution(record);

    // retention policy is async and not awaited in logExecution
    // but in tests we want to ensure it's called
    expect(spy).toHaveBeenCalled();
  });
});
