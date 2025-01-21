import { debugEnvVars } from '../../src/config/debugEnvVars';

describe('debugEnvVars', () => {
  it('should be defined', () => {
    expect(debugEnvVars).toBeDefined();
  });
});