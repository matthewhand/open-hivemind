import { parse } from '@message/helpers/commands/commandParser';

describe('commandParser.parse', () => {
  test.each([
    ['hello', 'input without exclamation mark'],
    ['  hello', 'input with leading whitespace'],
  ])('returns null when %s', (input, description) => {
    expect(parse(input)).toBeNull();
  });

  test.each([
    ['!', 'lone exclamation mark'],
    ['!   ', 'exclamation mark with whitespace'],
  ])('returns null for %s', (input, description) => {
    expect(parse(input)).toBeNull();
  });

  test('parses command and args with spaces', () => {
    expect(parse('!hello world x y')).toEqual({ command: 'hello', args: ['world', 'x', 'y'] });
  });

  test('parses with mixed whitespace including tabs', () => {
    expect(parse('!ping one two three')).toEqual({ command: 'ping', args: ['one', 'two', 'three'] });
  });

  test('trims surrounding whitespace and then parses', () => {
    expect(parse(  '  !cmd    a   ' )).toEqual({ command: 'cmd', args: ['a'] });
  });
});
