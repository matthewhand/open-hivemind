import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AuthManager } from '../../src/auth/AuthManager';
import { AuthMiddleware } from '../../src/auth/middleware';
import {
  ChangePasswordSchema,
  UpdateProfileSchema,
  UpdateUserSchema,
} from '../../src/server/schemas/auth.schemas';
import { validateRequest } from '../../src/validation/validateRequest';

/**
 * Focused unit tests for the critical authz hardening fixes:
 *  - UpdateProfileSchema rejects role escalation at the schema layer
 *  - AuthManager.updateUser never mass-assigns secrets
 *  - validateRequest reassigns stripped parse results onto req
 *  - authenticate rejects inactive users
 */
describe('authz hardening', () => {
  describe('UpdateProfileSchema', () => {
    it('allows username and email only', () => {
      const parsed = UpdateProfileSchema.parse({
        body: { username: 'alice', email: 'alice@example.com', role: 'admin' },
      });
      expect(parsed.body).toEqual({
        username: 'alice',
        email: 'alice@example.com',
      });
      expect(parsed.body).not.toHaveProperty('role');
    });

    it('still allows admin UpdateUserSchema to include role', () => {
      const parsed = UpdateUserSchema.parse({
        body: { username: 'bob', role: 'admin' },
      });
      expect(parsed.body.role).toBe('admin');
    });
  });

  describe('ChangePasswordSchema', () => {
    it('accepts currentPassword', () => {
      const parsed = ChangePasswordSchema.parse({
        body: { currentPassword: 'OldPass1', newPassword: 'NewPass12' },
      });
      expect(parsed.body.currentPassword).toBe('OldPass1');
    });

    it('accepts legacy oldPassword as fallback field', () => {
      const parsed = ChangePasswordSchema.parse({
        body: { oldPassword: 'OldPass1', newPassword: 'NewPass12' },
      });
      expect(parsed.body.oldPassword).toBe('OldPass1');
    });
  });

  describe('authenticate derives permissions from live role', () => {
    it('does not trust stale JWT permission claims after demotion', async () => {
      const auth = AuthManager.getInstance();
      const user = await auth.register({
        username: `liveperm-${Date.now()}`.slice(0, 20),
        email: `liveperm-${Date.now()}@example.com`,
        password: 'password123',
        role: 'admin',
      });

      // Mint a token while admin (JWT may embed admin permissions).
      const token = auth.generateAccessToken(user);
      // Demote in the store.
      auth.updateUser(user.id, { role: 'user' });

      const middleware = AuthMiddleware.getInstance();
      const req = {
        headers: { authorization: `Bearer ${token}` },
        ip: '8.8.8.8',
        get: () => undefined,
        connection: { remoteAddress: '8.8.8.8' },
        socket: { remoteAddress: '8.8.8.8' },
        method: 'GET',
        path: '/x',
      } as unknown as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      await middleware.authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      const authReq = req as Request & { user?: { role: string }; permissions?: string[] };
      expect(authReq.user?.role).toBe('user');
      // Admin permissions must not remain from the JWT claim.
      const adminPerms = auth.getUserPermissions('admin');
      const userPerms = auth.getUserPermissions('user');
      expect(authReq.permissions).toEqual(userPerms);
      // Sanity: admin has a permission user lacks (if the maps differ).
      if (adminPerms.some((p) => !userPerms.includes(p))) {
        const elevated = adminPerms.find((p) => !userPerms.includes(p))!;
        expect(authReq.permissions).not.toContain(elevated);
      }
    });
  });

  describe('AuthManager.updateUser allowlist', () => {
    const auth = AuthManager.getInstance();

    it('applies username/email/role/isActive but never passwordHash or 2FA secrets', async () => {
      const user = await auth.register({
        username: `allowlist-${Date.now()}`,
        email: `allowlist-${Date.now()}@example.com`,
        password: 'password123',
        role: 'user',
      });

      // Seed 2FA state via dedicated API so we can verify it is not overwritten
      // by mass-assignment attempts.
      const enrollment = auth.startTwoFactorEnrollment(user.id);
      expect(enrollment).not.toBeNull();

      const before = auth.getUserWithHash(user.id)!;
      const originalHash = before.passwordHash;

      auth.updateUser(user.id, {
        username: `renamed-${Date.now()}`.slice(0, 20),
        role: 'admin',
        isActive: false,
        passwordHash: 'attacker-hash',
        twoFactorSecret: 'ATTACKERSECRET',
        twoFactorPendingSecret: 'PENDINGATTACK',
        twoFactorEnabled: true,
        id: 'hijacked-id',
      } as Partial<typeof before>);

      const after = auth.getUserWithHash(user.id)!;
      expect(after.passwordHash).toBe(originalHash);
      expect(after.twoFactorSecret).toBeUndefined();
      // pending secret from enrollment must still be whatever enrollment set — not attacker value
      expect(after.twoFactorPendingSecret).toBe(enrollment!.secret);
      expect(after.twoFactorPendingSecret).not.toBe('PENDINGATTACK');
      expect(after.twoFactorEnabled).not.toBe(true);
      expect(after.id).toBe(user.id);
      expect(after.role).toBe('admin');
      expect(after.isActive).toBe(false);
    });
  });

  describe('validateRequest strips unknown fields onto req', () => {
    it('reassigns parsed body so unknown keys are removed', () => {
      const schema = z.object({
        body: z.object({
          email: z.string().email(),
        }),
      });

      const req = {
        body: { email: 'user@example.com', role: 'admin', passwordHash: 'x' },
        query: {},
        params: {},
      } as unknown as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      validateRequest(schema)(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ email: 'user@example.com' });
      expect(req.body).not.toHaveProperty('role');
      expect(req.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('authenticate rejects inactive users', () => {
    it('returns 401 for a valid token belonging to an inactive user', async () => {
      const auth = AuthManager.getInstance();
      const user = await auth.register({
        username: `inactive-${Date.now()}`,
        email: `inactive-${Date.now()}@example.com`,
        password: 'password123',
        role: 'user',
      });

      auth.updateUser(user.id, { isActive: false });
      const token = auth.generateAccessToken(auth.getUser(user.id)!);

      const middleware = AuthMiddleware.getInstance();
      const req = {
        headers: { authorization: `Bearer ${token}` },
        ip: '10.0.0.1',
        get: () => undefined,
        method: 'GET',
        path: '/api/test',
        connection: {},
        socket: {},
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      // Ensure localhost bypass cannot short-circuit this case
      const prevBypass = process.env.ALLOW_LOCALHOST_ADMIN;
      const prevTestBypass = process.env.ALLOW_TEST_BYPASS;
      delete process.env.ALLOW_LOCALHOST_ADMIN;
      delete process.env.ALLOW_TEST_BYPASS;

      try {
        await middleware.authenticate(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      } finally {
        if (prevBypass !== undefined) process.env.ALLOW_LOCALHOST_ADMIN = prevBypass;
        if (prevTestBypass !== undefined) process.env.ALLOW_TEST_BYPASS = prevTestBypass;
      }
    });
  });
});
