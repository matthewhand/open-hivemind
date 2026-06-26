import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Live Discord Integration', () => {
  test('Discord service loads in dev environment', async () => {
    // Run npm run dev and check for Discord service loading
    const { stdout } = await execAsync(
      'cd /mnt/models/projects/active/open-hivemind && timeout 30s npm run dev 2>&1 | grep -E "(Messenger services loaded|Filter results|Bot started)" || true'
    );

    console.log('Dev server output:', stdout);

    // Verify Discord service loads
    expect(stdout).toContain('Messenger services loaded');
    expect(stdout).toContain('originalCount: 1'); // Should have 1 Discord service

    // Verify filtering works
    if (stdout.includes('Filter results')) {
      expect(stdout).toContain('filteredCount: 1');
      expect(stdout).toContain('discord');
    }

    // Verify bot starts
    expect(stdout).toContain('Bot started');
  }, 45000); // 45 second timeout
});
