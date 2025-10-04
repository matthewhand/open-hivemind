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

  it('returns null for non-command or invalid inputs', () => {
    const invalidCases = [
      '',
      '   ',
      'hello world',
      'start! now',
      '!!start',
      'not a command',
      '!?',
      '!@#$%^&*()',
      null,
      undefined,
      42,
      {},
      [],
      '!🚀:deploy target'
    ];

    invalidCases.forEach(expectNull);
  });

  it('parses canonical command patterns', () => {
    const scenarios = [
      {
        input: '!start',
        expected: { commandName: 'start', action: '', args: [] }
      },
      {
        input: '!start:now',
        expected: { commandName: 'start', action: 'now', args: [] }
      },
      {
        input: '!deploy:prod server1 server2 --force',
        expected: { commandName: 'deploy', action: 'prod', args: ['server1', 'server2', '--force'] }
      },
      {
        input: '!config:set:debug true',
        expected: { commandName: 'config', action: 'set', args: [':debug', 'true'] }
      },
      {
        input: '!deploy:prod-v2.1',
        expected: { commandName: 'deploy', action: 'prod', args: ['-v2.1'] }
      },
      {
        input: '!echo "hello world" test',
        expected: { commandName: 'echo', action: '', args: ['"hello', 'world"', 'test'] }
      }
    ];

    scenarios.forEach(({ input, expected }) => {
      const result = parseCommand(input);
      expect(result).toEqual(expected);
    });
  });

  it('normalises whitespace while preserving argument order and case', () => {
    const whitespaceExamples = [
      { cmd: '  !status   ', expected: { commandName: 'status', action: '', args: [] } },
      {
        cmd: '!deploy:prod   server1    server2     --force',
        expected: { commandName: 'deploy', action: 'prod', args: ['server1', 'server2', '--force'] }
      },
      {
        cmd: '!start:now\tquickly   fast',
        expected: { commandName: 'start', action: 'now', args: ['quickly', 'fast'] }
      }
    ];

    whitespaceExamples.forEach(({ cmd, expected }) => {
      expect(parseCommand(cmd)).toEqual(expected);
    });

    const complexArgs = [
      {
        cmd: '!feature:toggle true FALSE yes No',
        expectedArgs: ['true', 'FALSE', 'yes', 'No']
      },
      {
        cmd: '!load:config /path/to/config.json ./relative/path',
        expectedArgs: ['/path/to/config.json', './relative/path']
      },
      {
        cmd: '!config:set {"key":"value","number":42}',
        expectedArgs: ['{"key":"value","number":42}']
      },
      {
        cmd: '!webhook:add https://example.com/hook?token=abc123',
        expectedArgs: ['https://example.com/hook?token=abc123']
      }
    ];

    complexArgs.forEach(({ cmd, expectedArgs }) => {
      const result = parseCommand(cmd);
      expect(result?.args).toEqual(expectedArgs);
    });

    const casePreserving = parseCommand('!echo Hello WORLD');
    expect(casePreserving?.commandName).toBe('echo');
    expect(casePreserving?.args).toEqual(['Hello', 'WORLD']);
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
