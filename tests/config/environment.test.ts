import { COMMAND_PREFIX } from '../../src/config/environment';

describe('environment config', () => {
  it('should export COMMAND_PREFIX as "!"', () => {
    expect(COMMAND_PREFIX).toBe('!');
  });

  it('should be a non-empty string', () => {
    expect(typeof COMMAND_PREFIX).toBe('string');
    expect(COMMAND_PREFIX.length).toBeGreaterThan(0);
  });
});
