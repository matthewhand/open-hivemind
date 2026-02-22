import { exec, spawn } from 'child_process';
import { SwarmInstaller } from '@hivemind/provider-openswarm/SwarmInstaller';

// Mock child_process fully
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn(),
}));

const mockSpawn = spawn as unknown as jest.Mock;
const mockExec = exec as unknown as jest.Mock;

describe('SwarmInstaller', () => {
  let installer: SwarmInstaller;
  let mockUnref: jest.Mock;
  let originalSetTimeout: any;

  beforeAll(() => {
    originalSetTimeout = global.setTimeout;
  });

  afterAll(() => {
    global.setTimeout = originalSetTimeout;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock setTimeout to fire immediately
    global.setTimeout = ((cb: any, ms: any) => cb()) as any;

    mockUnref = jest.fn();
    mockSpawn.mockReturnValue({
      unref: mockUnref,
      on: jest.fn(),
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
    });

    // Mock exec for promisify
    mockExec.mockImplementation((command, callback) => {
      if (callback) {
        // Synchronous callback to avoid async issues
        callback(null, 'success', '');
      }
      return { unref: jest.fn() };
    });

    installer = new SwarmInstaller();
  });

  afterEach(() => {
    global.setTimeout = originalSetTimeout;
  });

  describe('startSwarm', () => {
    it('should successfully start swarm with default port', async () => {
      const result = await installer.startSwarm();

      expect(result.success).toBe(true);

      // Default port is 8000
      expect(mockSpawn).toHaveBeenCalledWith(
        'swarm-api',
        ['--port', '8000'],
        expect.objectContaining({
          detached: true,
          stdio: 'ignore',
        })
      );
      expect(mockUnref).toHaveBeenCalled();
    });

    it('should successfully start swarm with valid custom port', async () => {
      const result = await installer.startSwarm(9000);

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('swarm-api', ['--port', '9000'], expect.any(Object));
    });

    it('should reject invalid port (non-number string)', async () => {
      const result = await installer.startSwarm('invalid' as any);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid port number');
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should reject invalid port (out of range)', async () => {
      const result = await installer.startSwarm(70000);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid port number');
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should reject invalid port (negative)', async () => {
      const result = await installer.startSwarm(-1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid port number');
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should handle spawn errors gracefully', async () => {
      mockSpawn.mockImplementation(() => {
        throw new Error('Spawn failed');
      });

      const result = await installer.startSwarm();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Spawn failed');
    });

    it('should handle dependency check failure', async () => {
      // Make exec fail for the check
      mockExec.mockImplementationOnce((cmd, cb) => {
        if (cb) cb(new Error('Command not found'), '', 'error');
        return { unref: jest.fn() };
      });

      const result = await installer.startSwarm();

      expect(result.success).toBe(false);
      expect(result.message).toContain('OpenSwarm not installed');
      expect(mockSpawn).not.toHaveBeenCalled();
    });
  });
});
