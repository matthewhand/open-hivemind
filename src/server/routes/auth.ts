import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { AuthManager } from '../../auth/AuthManager';
import { authenticate, requireAdmin } from '../../auth/middleware';
import type { AuthMiddlewareRequest, LoginCredentials, RegisterData } from '../../auth/types';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { isTrustedAdminIP } from '../middleware/security';
import { HTTP_STATUS } from '../../types/constants';
import { validateRequest as validate } from '../../validation/validateRequest';
import {
  ChangePasswordSchema,
  LoginSchema,
  LogoutSchema,
  RefreshTokenSchema,
  RegisterSchema,
  UpdateUserSchema,
  UserIdParamSchema,
  VerifyTokenSchema,
} from '../schemas/auth.schemas';
import { ApiResponse } from '../utils/apiResponse';

const debug = Debug('app:AuthRoutes');
const router = Router();
const authManager = AuthManager.getInstance();

/**
 * @openapi
 * /webui/api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *             required: [username, password]
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Authentication failed
 */
router.post(
  '/login',
  authRateLimiter,
  validate(LoginSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const credentials: LoginCredentials = req.body;
      // Normal authentication flow

      const authResult = await authManager.login(credentials);

      return res.json(ApiResponse.success(authResult));
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      debug('Login error:', errMsg);
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(ApiResponse.error(errMsg || 'Invalid credentials', undefined, 401));
    }
  })
);

/**
 * @openapi
 * /webui/api/auth/register:
 *   post:
 *     summary: User registration (admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [user, admin] }
 *             required: [username, email, password]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Registration failed
 */
router.post(
  '/register',
  authenticate,
  requireAdmin,
  validate(RegisterSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const registerData: RegisterData = req.body;

      const user = await authManager.register(registerData);

      return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success({ user }));
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      debug('Registration error:', errMsg);
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.error(errMsg || 'Failed to register user', undefined, 400));
    }
  })
);

/**
 * @openapi
 * /webui/api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *             required: [refreshToken]
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Token refresh failed
 */
router.post(
  '/refresh',
  validate(RefreshTokenSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { refreshToken } = req.body;

      const authResult = await authManager.refreshToken(refreshToken);

      return res.json(ApiResponse.success(authResult));
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      debug('Token refresh error:', errMsg);
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(ApiResponse.error(errMsg || 'Invalid refresh token', undefined, 401));
    }
  })
);

/**
 * @openapi
 * /webui/api/auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Logout successful
 *       500:
 *         description: Logout failed
 */
router.post(
  '/logout',
  authenticate,
  validate(LogoutSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await authManager.logout(refreshToken);
      }

      return res.json(ApiResponse.success());
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      debug('Logout error:', errMsg);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Logout failed', undefined, 500));
    }
  })
);

/**
 * @openapi
 * /webui/api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/verify',
  validate(VerifyTokenSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { token } = req.body;
      const payload = authManager.verifyAccessToken(token);
      const user = authManager.getUser((payload as Record<string, unknown>).userId as string);
      if (!user)
        return res
          .status(HTTP_STATUS.UNAUTHORIZED)
          .json(ApiResponse.error('User not found', undefined, 401));
      return res.json(ApiResponse.success({ user }));
    } catch (error: unknown) {
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(ApiResponse.error('Invalid token', undefined, 401));
    }
  })
);

// GET /api/auth/verify - Verify JWT token from Authorization header
// No rate limiter — frontend calls this on every page load
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(ApiResponse.error('Bearer token required'));
    }
    const token = authHeader.slice(7);
    const payload = authManager.verifyAccessToken(token) as any;
    const user = authManager.getUser(payload.userId);
    if (!user) return res.status(401).json(ApiResponse.error('User not found'));
    return res.json(
      ApiResponse.success({
        user,
        tokenValid: true,
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      })
    );
  } catch {
    return res.status(401).json(ApiResponse.error('Invalid or expired token'));
  }
});

// GET /api/auth/trusted-status — check if request comes from trusted IP
// No rate limiter — read-only status check, called on every page load
router.get('/trusted-status', (req: Request, res: Response) => {
  const trusted = isTrustedAdminIP(req);
  return res.json(ApiResponse.success({ trusted }));
});

// POST /api/auth/trusted-login — passwordless admin login from trusted IPs
router.post('/trusted-login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    if (!isTrustedAdminIP(req)) {
      return res.status(403).json(ApiResponse.error('Not a trusted network'));
    }
    const username = req.body?.username || 'admin';
    const authResult = await authManager.trustedLogin(username);
    return res.json(ApiResponse.success(authResult));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Trusted login failed';
    return res.status(401).json(ApiResponse.error(msg));
  }
});

router.get('/me', authenticate, (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  return res.json(ApiResponse.success({ user: authReq.user }));
});

/**
 * PUT /webui/api/auth/password
 * Change user password
 */
router.put(
  '/password',
  authenticate,
  validate(ChangePasswordSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!req.user) {
        return res
          .status(HTTP_STATUS.UNAUTHORIZED)
          .json(ApiResponse.error('Authentication required', undefined, 401));
      }

      if (!currentPassword || !newPassword) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(ApiResponse.error('Validation error', undefined, 400));
      }

      // Get user with password hash for verification
      const userWithHash = authManager.getUserWithHash(req.user.id);

      if (!userWithHash || !userWithHash.passwordHash) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(ApiResponse.error('User not found', undefined, 404));
      }

      // Verify current password
      const isValidCurrentPassword = await authManager.verifyPassword(
        currentPassword,
        userWithHash.passwordHash
      );

      if (!isValidCurrentPassword) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(ApiResponse.error('Validation error', undefined, 400));
      }

      // Validate new password
      if (newPassword.length < 8) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(ApiResponse.error('Validation error', undefined, 400));
      }

      const success = await authManager.changePassword(req.user.id, newPassword);

      if (success) {
        return res.json(ApiResponse.success());
      } else {
        return res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(ApiResponse.error('Password change failed', undefined, 500));
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      debug('Password change error:', errMsg);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Password change failed', undefined, 500));
    }
  })
);

/**
 * GET /webui/api/auth/users
 * Get all users (admin only)
 */
router.get('/users', authenticate, requireAdmin, (_req: Request, res: Response) => {
  try {
    const users = authManager.getAllUsers();

    return res.json(ApiResponse.success({ users }));
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    debug('Get users error:', errMsg);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to get users', undefined, 500));
  }
});

/**
 * GET /webui/api/auth/users/:userId
 * Get specific user (admin only)
 */
router.get(
  '/users/:userId',
  authenticate,
  requireAdmin,
  validate(UserIdParamSchema),
  (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const user = authManager.getUser(userId);

      if (!user) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(ApiResponse.error('User not found', undefined, 404));
      }

      return res.json(ApiResponse.success({ user }));
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      debug('Get user error:', errMsg);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to get user', undefined, 500));
    }
  }
);

/**
 * PUT /webui/api/auth/users/:userId
 * Update user (admin only)
 */
router.put(
  '/users/:userId',
  authenticate,
  requireAdmin,
  validate(UserIdParamSchema.merge(UpdateUserSchema)),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const updates = req.body;

      // Don't allow password updates through this endpoint
      delete updates.password;
      delete updates.passwordHash;

      const updatedUser = authManager.updateUser(userId, updates);

      if (!updatedUser) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(ApiResponse.error('User not found', undefined, 404));
      }

      return res.json(ApiResponse.success({ user: updatedUser }));
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      debug('Update user error:', errMsg);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to update user', undefined, 500));
    }
  }
);

/**
 * DELETE /webui/api/auth/users/:userId
 * Delete user (admin only)
 */
router.delete(
  '/users/:userId',
  authenticate,
  requireAdmin,
  validate(UserIdParamSchema),
  (req: Request, res: Response) => {
    const authReq = req as AuthMiddlewareRequest;
    try {
      const { userId } = req.params;

      // Prevent deleting self
      if (authReq.user && authReq.user.id === userId) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(ApiResponse.error('Invalid operation', undefined, 400));
      }

      const deleted = authManager.deleteUser(userId);

      if (!deleted) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(ApiResponse.error('User not found', undefined, 404));
      }

      return res.json(ApiResponse.success());
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      debug('Delete user error:', errMsg);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to delete user', undefined, 500));
    }
  }
);

/**
 * GET /webui/api/auth/permissions
 * Get current user permissions
 */
router.get('/permissions', authenticate, (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  if (!authReq.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(ApiResponse.error('Authentication required', undefined, 401));
  }

  const permissions = authManager.getUserPermissions(authReq.user.role);

  return res.json(
    ApiResponse.success({
      role: authReq.user.role,
      permissions,
      user: authReq.user,
    })
  );
});

export default router;
