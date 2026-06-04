/**
 * Account-lockout behavior for AuthManager.login.
 *
 * Runs under NODE_ENV=test, where AuthManager.verifyPassword short-circuits:
 * a hash of the form `test-hash-for-<pwd>` matches password `<pwd>`, and a few
 * well-known passwords are always accepted. We register users (which produces
 * `test-hash-for-*` hashes) so we control the valid password precisely.
 */
import { AuthManager } from '../../../src/auth/AuthManager';
import { generateToken } from '../../../src/auth/TotpService';
import { AuthenticationError } from '../../../src/types/errorClasses';

type AuthManagerCtor = {
  new (): AuthManager;
};

/**
 * Build a fresh AuthManager instance (bypassing the private constructor so each
 * test is isolated) with the supplied lockout-related env overrides applied at
 * construction time, since those are read in field initializers.
 */
function makeManager(env: Record<string, string | undefined>): AuthManager {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    saved[key] = process.env[key];
    if (env[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = env[key];
    }
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (AuthManager as unknown as AuthManagerCtor)();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

async function registerUser(
  mgr: AuthManager,
  username: string,
  password: string
): Promise<void> {
  await mgr.register({
    username,
    email: `${username}@example.com`,
    password,
  });
}

describe('AuthManager account lockout', () => {
  const PASSWORD = 'correct-horse-battery';

  it('locks out after the configured number of failed attempts', async () => {
    const mgr = makeManager({
      AUTH_MAX_LOGIN_ATTEMPTS: '3',
      AUTH_LOCKOUT_DURATION_SECONDS: '900',
    });
    await registerUser(mgr, 'alice', PASSWORD);

    // 3 failures reaches the threshold and locks the account.
    for (let i = 0; i < 3; i++) {
      await expect(
        mgr.login({ username: 'alice', password: 'wrong' })
      ).rejects.toBeInstanceOf(AuthenticationError);
    }

    expect(mgr.isLockedOut('alice')).toBe(true);

    // Even the CORRECT password is now rejected while locked.
    await expect(
      mgr.login({ username: 'alice', password: PASSWORD })
    ).rejects.toMatchObject({ provider: 'ACCOUNT_LOCKED' });
  });

  it('does not lock before reaching the threshold and a success still works', async () => {
    const mgr = makeManager({
      AUTH_MAX_LOGIN_ATTEMPTS: '5',
      AUTH_LOCKOUT_DURATION_SECONDS: '900',
    });
    await registerUser(mgr, 'bob', PASSWORD);

    for (let i = 0; i < 4; i++) {
      await expect(mgr.login({ username: 'bob', password: 'nope' })).rejects.toBeTruthy();
    }
    expect(mgr.isLockedOut('bob')).toBe(false);

    const token = await mgr.login({ username: 'bob', password: PASSWORD });
    expect(token.accessToken).toBeTruthy();
  });

  it('resets the failure counter after a successful login', async () => {
    const mgr = makeManager({ AUTH_MAX_LOGIN_ATTEMPTS: '3' });
    await registerUser(mgr, 'carol', PASSWORD);

    await expect(mgr.login({ username: 'carol', password: 'x' })).rejects.toBeTruthy();
    await expect(mgr.login({ username: 'carol', password: 'x' })).rejects.toBeTruthy();

    // Successful login clears the counter.
    await mgr.login({ username: 'carol', password: PASSWORD });

    // Two fresh failures should NOT lock (counter was reset).
    await expect(mgr.login({ username: 'carol', password: 'x' })).rejects.toBeTruthy();
    await expect(mgr.login({ username: 'carol', password: 'x' })).rejects.toBeTruthy();
    expect(mgr.isLockedOut('carol')).toBe(false);
  });

  it('counts an invalid TOTP code toward account lockout', async () => {
    const mgr = makeManager({
      AUTH_MAX_LOGIN_ATTEMPTS: '3',
      AUTH_LOCKOUT_DURATION_SECONDS: '900',
    });
    const user = await mgr.register({
      username: 'frank',
      email: 'frank@example.com',
      password: PASSWORD,
    });

    // Enrol and enable 2FA for frank.
    const { secret } = mgr.startTwoFactorEnrollment(user.id)!;
    expect(mgr.confirmTwoFactorEnrollment(user.id, generateToken(secret))).toBe(true);

    // A code that is definitely NOT the current valid token.
    const valid = generateToken(secret);
    const wrongCode = valid === '000000' ? '111111' : '000000';

    // Correct password but wrong second factor, repeated to the threshold,
    // must lock the account — otherwise TOTP is brute-forceable.
    for (let i = 0; i < 3; i++) {
      await expect(
        mgr.login({ username: 'frank', password: PASSWORD, totpCode: wrongCode })
      ).rejects.toBeInstanceOf(AuthenticationError);
    }

    expect(mgr.isLockedOut('frank')).toBe(true);
  });

  it('auto-unlocks once the lockout duration elapses', async () => {
    jest.useFakeTimers();
    try {
      const mgr = makeManager({
        AUTH_MAX_LOGIN_ATTEMPTS: '2',
        AUTH_LOCKOUT_DURATION_SECONDS: '60',
      });
      await registerUser(mgr, 'dave', PASSWORD);

      await expect(mgr.login({ username: 'dave', password: 'x' })).rejects.toBeTruthy();
      await expect(mgr.login({ username: 'dave', password: 'x' })).rejects.toBeTruthy();
      expect(mgr.isLockedOut('dave')).toBe(true);

      // Advance just past the 60s lockout window.
      jest.advanceTimersByTime(61_000);
      expect(mgr.isLockedOut('dave')).toBe(false);

      // And the correct password works again.
      const token = await mgr.login({ username: 'dave', password: PASSWORD });
      expect(token.accessToken).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('treats different IPs as independent buckets', async () => {
    const mgr = makeManager({ AUTH_MAX_LOGIN_ATTEMPTS: '2' });
    await registerUser(mgr, 'erin', PASSWORD);

    // Lock from IP A.
    await expect(
      mgr.login({ username: 'erin', password: 'x', ipAddress: '10.0.0.1' })
    ).rejects.toBeTruthy();
    await expect(
      mgr.login({ username: 'erin', password: 'x', ipAddress: '10.0.0.1' })
    ).rejects.toBeTruthy();
    expect(mgr.isLockedOut('erin', '10.0.0.1')).toBe(true);

    // A different IP is unaffected and the legitimate user can still log in.
    expect(mgr.isLockedOut('erin', '10.0.0.2')).toBe(false);
    const token = await mgr.login({
      username: 'erin',
      password: PASSWORD,
      ipAddress: '10.0.0.2',
    });
    expect(token.accessToken).toBeTruthy();
  });

  it('disables lockout entirely when the threshold is <= 0', async () => {
    const mgr = makeManager({ AUTH_MAX_LOGIN_ATTEMPTS: '0' });
    await registerUser(mgr, 'frank', PASSWORD);

    for (let i = 0; i < 20; i++) {
      await expect(mgr.login({ username: 'frank', password: 'x' })).rejects.toBeTruthy();
    }
    expect(mgr.isLockedOut('frank')).toBe(false);

    // Correct password still works — lockout never engaged.
    const token = await mgr.login({ username: 'frank', password: PASSWORD });
    expect(token.accessToken).toBeTruthy();
  });

  it('locks for unknown usernames too (prevents probing) and resetLockout clears it', async () => {
    const mgr = makeManager({ AUTH_MAX_LOGIN_ATTEMPTS: '3' });

    for (let i = 0; i < 3; i++) {
      await expect(
        mgr.login({ username: 'ghost', password: 'x' })
      ).rejects.toBeInstanceOf(AuthenticationError);
    }
    expect(mgr.isLockedOut('ghost')).toBe(true);

    mgr.resetLockout('ghost');
    expect(mgr.isLockedOut('ghost')).toBe(false);
  });

  it('uses safe defaults (5 attempts) when env is unset', async () => {
    const mgr = makeManager({
      AUTH_MAX_LOGIN_ATTEMPTS: undefined,
      AUTH_LOCKOUT_DURATION_SECONDS: undefined,
    });
    await registerUser(mgr, 'heidi', PASSWORD);

    for (let i = 0; i < 4; i++) {
      await expect(mgr.login({ username: 'heidi', password: 'x' })).rejects.toBeTruthy();
    }
    expect(mgr.isLockedOut('heidi')).toBe(false); // 4 < default 5

    await expect(mgr.login({ username: 'heidi', password: 'x' })).rejects.toBeTruthy();
    expect(mgr.isLockedOut('heidi')).toBe(true); // 5th failure locks
  });
});
