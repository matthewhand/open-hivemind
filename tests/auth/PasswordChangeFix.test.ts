import { AuthManager } from '../../src/auth/AuthManager';
import { User } from '../../src/auth/types';

describe('Password Change Vulnerability Fix Verification', () => {
  let authManager: AuthManager;
  let user: User;

  beforeEach(async () => {
    // Reset singleton
    (AuthManager as any).instance = null;
    authManager = AuthManager.getInstance();

    // Register a user
    user = await authManager.register({
        username: 'victim',
        email: 'victim@example.com',
        password: 'oldPassword123'
    });
  });

  it('verifies that the new logic correctly validates password for change', async () => {
    // 1. Simulate middleware behavior (which strips hash)
    const userFromMiddleware = authManager.getUser(user.id);
    expect(userFromMiddleware?.passwordHash).toBeUndefined();

    // 2. Simulate the NEW route logic
    const currentPasswordInput = 'oldPassword123';

    // Get user with hash using the new method
    const userWithHash = authManager.getUserWithHash(user.id);

    expect(userWithHash).not.toBeNull();
    expect(userWithHash?.passwordHash).toBeDefined();

    // Verify password against the retrieved hash
    const isValid = await authManager.verifyPassword(currentPasswordInput, userWithHash!.passwordHash!);

    // Assert that validation succeeds
    expect(isValid).toBe(true);
  });

  it('verifies that the old logic would fail (regression check)', async () => {
      // Simulate OLD logic failure
      const userFromMiddleware = authManager.getUser(user.id);
      const hashToVerify = userFromMiddleware?.passwordHash || '';
      const isValid = await authManager.verifyPassword('oldPassword123', hashToVerify);
      expect(isValid).toBe(false);
  });
});
