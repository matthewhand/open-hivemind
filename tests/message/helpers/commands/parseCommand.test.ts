jest.mock('debug', () => {
  const mockDebug = jest.fn();
  return jest.fn(() => mockDebug);
});

import { parseCommand } from '@message/helpers/commands/parseCommand';

const Debug = require('debug');
const mockDebug = Debug('app:parseCommand');

const expectNull = (input: unknown) => {
  const result = parseCommand(input as any);
  expect(result).toBeNull();
};

describe('parseCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should correctly parse valid commands and reject invalid ones', () => {
    const testCases = [
      // Invalid cases
      { input: '', expected: null },
      { input: '   ', expected: null },
      { input: 'hello world', expected: null },
      { input: 'start! now', expected: null },
      { input: '!!start', expected: null },
      { input: 'not a command', expected: null },
      { input: '!?', expected: null },
      { input: '!@#$%^&*()', expected: null },
      { input: null, expected: null },
      { input: undefined, expected: null },
      { input: 42, expected: null },
      { input: {}, expected: null },
      { input: [], expected: null },
      { input: '!🚀:deploy target', expected: null },
      
      // Valid cases
      { input: '!start', expected: { commandName: 'start', action: '', args: [] } },
      { input: '!start:now', expected: { commandName: 'start', action: 'now', args: [] } },
      { input: '!deploy:prod server1 server2 --force', expected: { commandName: 'deploy', action: 'prod', args: ['server1', 'server2', '--force'] } },
      { input: '!config:set:debug true', expected: { commandName: 'config', action: 'set', args: [':debug', 'true'] } },
      { input: '!deploy:prod-v2.1', expected: { commandName: 'deploy', action: 'prod', args: ['-v2.1'] } },
      { input: '!echo "hello world" test', expected: { commandName: 'echo', action: '', args: ['"hello', 'world"', 'test'] } }
    ];

    testCases.forEach(({ input, expected }) => {
      const result = parseCommand(input as any);
      expect(result).toEqual(expected);
    });
  });

  it('normalises whitespace while preserving argument order and case', () => {
    const testCases = [
      { cmd: '  !status   ', expected: { commandName: 'status', action: '', args: [] } },
      {
        cmd: '!deploy:prod   server1    server2     --force',
        expected: { commandName: 'deploy', action: 'prod', args: ['server1', 'server2', '--force'] }
      },
      {
        cmd: '!start:now\tquickly   fast',
        expected: { commandName: 'start', action: 'now', args: ['quickly', 'fast'] }
      },
      {
        cmd: '!feature:toggle true FALSE yes No',
        expected: { commandName: 'feature', action: 'toggle', args: ['true', 'FALSE', 'yes', 'No'] }
      },
      {
        cmd: '!load:config /path/to/config.json ./relative/path',
        expected: { commandName: 'load', action: 'config', args: ['/path/to/config.json', './relative/path'] }
      },
      {
        cmd: '!config:set {"key":"value","number":42}',
        expected: { commandName: 'config', action: 'set', args: ['{"key":"value","number":42}'] }
      },
      {
        cmd: '!webhook:add https://example.com/hook?token=abc123',
        expected: { commandName: 'webhook', action: 'add', args: ['https://example.com/hook?token=abc123'] }
      },
      {
        cmd: '!echo Hello WORLD',
        expected: { commandName: 'echo', action: '', args: ['Hello', 'WORLD'] }
      }
    ];

    testCases.forEach(({ cmd, expected }) => {
      const result = parseCommand(cmd);
      expect(result).toEqual(expected);
    });
  });

  it('enforces regex boundaries for command and action segments', () => {
    const valid = ['!test', '!test123', '!config:RESET', '!123command'];
    const invalid = ['!@command', '!.command', '!-command'];

    valid.forEach(cmd => {
      const result = parseCommand(cmd);
      expect(result).not.toBeNull();
    });

    invalid.forEach(expectNull);

    const truncated = parseCommand('!test:action-name');
    expect(truncated?.action).toBe('action');
    expect(truncated?.args).toEqual(['-name']);
  });

  it('emits informative debug logs for key paths', () => {
    parseCommand(null as any);
    parseCommand('plain text');
    parseCommand('!test:action arg1 arg2');
    parseCommand('!@invalid');

    expect(mockDebug).toHaveBeenCalledWith('Command content is null or undefined.');
    expect(mockDebug).toHaveBeenCalledWith('Not a command message.');
    expect(mockDebug).toHaveBeenCalledWith('Attempting to parse command content: !test:action arg1 arg2');
    expect(mockDebug).toHaveBeenCalledWith('Parsed command - Name: test  Action: action, Args: arg1 arg2');
    expect(mockDebug).toHaveBeenCalledWith('Command content did not match expected pattern.');
  });
});
