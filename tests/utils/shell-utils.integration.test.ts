import { executeCommandSafe } from '../../src/utils/utils';

describe('Shell Utils Integration', () => {
  it('should successfully execute a safe command', async () => {
    // We use node directly to ensure it is found in PATH
    const command = 'node -e "process.stdout.write(\'hello\')"';
    const result = await executeCommandSafe(command);
    expect(result.trim()).toBe('hello');
  });

  it('should throw an error for non-existent commands', async () => {
    await expect(executeCommandSafe('non-existent-command-12345')).rejects.toThrow();
  });

  it('should respect timeout or exit codes', async () => {
    // command that exits with error
    await expect(executeCommandSafe('false')).rejects.toThrow();
  });
});
