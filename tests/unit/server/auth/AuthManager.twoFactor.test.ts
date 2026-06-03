import { AuthManager } from '../../../../src/auth/AuthManager';
import { generateToken } from '../../../../src/auth/TotpService';
import { AuthenticationError } from '../../../../src/types/errorClasses';

/**
 * Tests for TOTP two-factor authentication in AuthManager.
 *
 * Runs under NODE_ENV=test, where AuthManager.verifyPassword accepts known
 * test passwords (see AuthManager.verifyPassword). We register users with
 * `password123` so the password check passes and we can isolate 2FA behavior.
 */
describe('AuthManager two-factor authentication', () => {
  const authManager = AuthManager.getInstance();

  const register2faUser = async (username: string) => {
    const user = await authManager.register({
      username,
      email: `${username}@example.com`,
      password: 'password123',
      role: 'user',
    });
    return user.id;
  };

  describe('opt-in enrollment lifecycle', () => {
    it('does not enable 2FA until enrollment is confirmed', async () => {
      const id = await register2faUser('tfa-lifecycle');
      expect(authManager.isTwoFactorEnabled(id)).toBe(false);

      const enrollment = authManager.startTwoFactorEnrollment(id);
      expect(enrollment).not.toBeNull();
      expect(enrollment!.secret).toMatch(/^[A-Z2-7]+$/);
      expect(enrollment!.otpauthUri).toContain('otpauth://totp/');

      // Pending only: still disabled, and login must not require a code yet.
      expect(authManager.isTwoFactorEnabled(id)).toBe(false);
      await expect(
        authManager.login({ username: 'tfa-lifecycle', password: 'password123' })
      ).resolves.toHaveProperty('accessToken');
    });

    it('rejects confirmation with an invalid code and stays disabled', async () => {
      const id = await register2faUser('tfa-badconfirm');
      authManager.startTwoFactorEnrollment(id);
      expect(authManager.confirmTwoFactorEnrollment(id, '000000')).toBe(false);
      expect(authManager.isTwoFactorEnabled(id)).toBe(false);
    });

    it('enables 2FA after confirming with a valid code', async () => {
      const id = await register2faUser('tfa-enable');
      const { secret } = authManager.startTwoFactorEnrollment(id)!;
      const code = generateToken(secret);
      expect(authManager.confirmTwoFactorEnrollment(id, code)).toBe(true);
      expect(authManager.isTwoFactorEnabled(id)).toBe(true);
    });
  });

  describe('login enforcement', () => {
    const enableFor = async (username: string): Promise<string> => {
      const id = await register2faUser(username);
      const { secret } = authManager.startTwoFactorEnrollment(id)!;
      authManager.confirmTwoFactorEnrollment(id, generateToken(secret));
      return secret;
    };

    it('requires a TOTP code once 2FA is enabled', async () => {
      await enableFor('tfa-login-required');
      await expect(
        authManager.login({ username: 'tfa-login-required', password: 'password123' })
      ).rejects.toThrow(AuthenticationError);
    });

    it('rejects login with an incorrect TOTP code', async () => {
      await enableFor('tfa-login-wrong');
      await expect(
        authManager.login({
          username: 'tfa-login-wrong',
          password: 'password123',
          totpCode: '000000',
        })
      ).rejects.toThrow(AuthenticationError);
    });

    it('succeeds with a valid password and TOTP code', async () => {
      const secret = await enableFor('tfa-login-ok');
      const result = await authManager.login({
        username: 'tfa-login-ok',
        password: 'password123',
        totpCode: generateToken(secret),
      });
      expect(result).toHaveProperty('accessToken');
      expect(result.user.username).toBe('tfa-login-ok');
    });

    it('still rejects a wrong password before checking 2FA', async () => {
      await enableFor('tfa-login-wrongpass');
      await expect(
        authManager.login({
          username: 'tfa-login-wrongpass',
          password: 'definitely-wrong',
          totpCode: '123456',
        })
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('backward compatibility (no lockout)', () => {
    it('lets users without 2FA log in with password only', async () => {
      await register2faUser('tfa-none');
      const result = await authManager.login({
        username: 'tfa-none',
        password: 'password123',
      });
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('disabling 2FA', () => {
    it('clears secrets and reverts to password-only login', async () => {
      const id = await register2faUser('tfa-disable');
      const { secret } = authManager.startTwoFactorEnrollment(id)!;
      authManager.confirmTwoFactorEnrollment(id, generateToken(secret));
      expect(authManager.isTwoFactorEnabled(id)).toBe(true);

      expect(authManager.disableTwoFactor(id)).toBe(true);
      expect(authManager.isTwoFactorEnabled(id)).toBe(false);

      const result = await authManager.login({
        username: 'tfa-disable',
        password: 'password123',
      });
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('secret hygiene', () => {
    it('never leaks TOTP secrets in sanitized user objects', async () => {
      const id = await register2faUser('tfa-hygiene');
      const { secret } = authManager.startTwoFactorEnrollment(id)!;
      authManager.confirmTwoFactorEnrollment(id, generateToken(secret));

      const safe = authManager.getUser(id) as Record<string, unknown>;
      expect(safe).not.toHaveProperty('twoFactorSecret');
      expect(safe).not.toHaveProperty('twoFactorPendingSecret');
      expect(safe).not.toHaveProperty('passwordHash');

      // The login result user must also be sanitized.
      const login = await authManager.login({
        username: 'tfa-hygiene',
        password: 'password123',
        totpCode: generateToken(secret),
      });
      expect(login.user as Record<string, unknown>).not.toHaveProperty('twoFactorSecret');
    });
  });
});
