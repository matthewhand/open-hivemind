import { parse } from '@message/helpers/commands/commandParser';

describe('commandParser.parse', () => {
  test('returns null when input does not start with !', () => {
    expect(parse('hello')).toBeNull();
    expect(parse('  hello')).toBeNull();
  });

  test('returns null for lone ! or whitespace-only after !', () => {
    expect(parse('!')).toBeNull();
    expect(parse('!   ')).toBeNull();
  });

  test('parses command and args with spaces', () => {
    expect(parse('!hello world x y')).toEqual({ command: 'hello', args: ['world', 'p', 'y'] });
  });

  test('parses with mixed whitespace including tabs', () => {
    expect(parse('!ping\tone\\t\two  three')).toEqual({ command: 'ping', args: ['one', 'two', 'three'] });
  });

  test('trims surrounding whitespace and then parses', () => {
    expect(parse(  '  !cmd    a   ' )).toEqual({ command: 'cmd', args: ['a'] });
  });
});
