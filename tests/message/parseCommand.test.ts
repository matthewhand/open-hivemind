import { parseCommand } from '@message/helpers/commands/parseCommand';

describe('parseCommand', () => {
  test('returns null when input is not a string or missing !', () => {
    // @ts-ignore
    expect(parseCommand(undefined as any)).toBeNull();
    // @ts-ignore
    expect(parseCommand(null as any)).toBeNull();
    // @ts-ignore
    expect(parseCommand(123 as any)).toBeNull();
    expect(parseCommand('hello')).toBeNull();
  });

  test('parses name, action, and args', () => {
    expect(parseCommand('!Hello:run a  b\t c')).toEqual({
      commandName: 'hello',
      action: 'run',
      args: ['a', 'b', 'c'],
    });
  });

  test('parses name only and splits args by whitespace', () => {
    expect(parseCommand('!ping one\ttwo   three')).toEqual({
      commandName: 'ping',
      action: '',
      args: ['one', 'two', 'three'],
    });
  });

  test('trims surrounding whitespace', () => {
    expect(parseCommand('  !CMD    alpha   ')).toEqual({
      commandName: 'cmd',
      action: '',
      args: ['alpha'],
    });
  });

  test('returns null when pattern does not match', () => {
    expect(parseCommand('!?not-a-match')).toBeNull();
  });
});
