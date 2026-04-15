import { executeCommandSafe } from '../../src/utils/utils';

describe('Shell Utils Integration', () => {
  it('should successfully execute a safe command', async () => {
    // We use 'echo' as a guaranteed safe command across environments
    const result = await executeCommandSafe('echo "hello world"');
    expect(result.trim()).toBe('hello world');
  });

  it('should throw an error for non-existent commands', async () => {
    await expect(executeCommandSafe('non-existent-command-12345')).rejects.toThrow();
  });

  it('should respect timeout or exit codes', async () => {
    // command that exits with error
    await expect(executeCommandSafe('false')).rejects.toThrow();
  });
});
