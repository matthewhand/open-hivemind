import { AuthManager } from '../../src/auth/AuthManager';
import bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('$2b$10$salt'),
  hashSync: jest.fn().mockReturnValue('$2b$10$hashedpasswordSync'),
}));

describe('AuthManager Security Fix', () => {
  let authManager: AuthManager;
  const originalEnv = process.env;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Clear singleton instance
    // Note: Since we use resetModules, AuthManager class is re-imported each time if we require it inside test
    // But since we import it at top level, we need to access the class from the require in the test or clear the instance on the class.
    // However, TypeScript import is static.
    // Let's use require inside the test to get a fresh module if possible, or just clear the static instance.

    // We can't easily clear the static instance of the top-level imported class if it's private.
    // But we can use (AuthManager as any).instance = null;
    (AuthManager as any).instance = null;

    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    warnSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('should use ADMIN_PASSWORD if provided in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_PASSWORD = 'mysecurepassword';

    // We need to re-require AuthManager to ensure env vars are picked up if they are read at module level (which they are not, they are read in constructor/methods)
    // But bcrypt mock is persistent.

    authManager = AuthManager.getInstance();

    const admin = authManager.getUser('admin');
    expect(admin).toBeDefined();

    // Check if bcrypt.hashSync was called with the correct password
    expect(bcrypt.hashSync).toHaveBeenCalledWith('mysecurepassword', 12);

    // Should NOT warn about generated password
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Generated temporary admin password'));
  });

  it('should generate random password if ADMIN_PASSWORD is missing in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_PASSWORD;

    authManager = AuthManager.getInstance();

    const admin = authManager.getUser('admin');
    expect(admin).toBeDefined();

    // Verify hashSync was called with a generated password
    const calls = (bcrypt.hashSync as jest.Mock).mock.calls;
    // We expect at least one call (for admin user creation)
    expect(calls.length).toBeGreaterThan(0);

    // Find the call for admin user (it might be the only one)
    const generatedPassword = calls[calls.length - 1][0];

    // Verify password format (hex string of 16 bytes = 32 chars)
    expect(generatedPassword).toMatch(/^[0-9a-f]{32}$/);

    // Verify warning was logged
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('WARNING: No ADMIN_PASSWORD environment variable found.'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`Generated temporary admin password: ${generatedPassword}`));
  });

  it('should still use default password in test environment', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.ADMIN_PASSWORD;

    authManager = AuthManager.getInstance();

    // In test environment, it doesn't use bcrypt.hashSync, it uses 'test-admin-hash' directly
    expect(bcrypt.hashSync).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();

    const admin = authManager.getUser('admin');
    // The implementation details of how passwordHash is stored in test env might vary,
    // but based on current code it is 'test-admin-hash'
    // We can't check private field easily, but we can check if login works with default password
    // But login is async and calls verifyPassword which is mocked/handled.
  });
});
