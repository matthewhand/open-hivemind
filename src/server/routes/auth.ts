import Debug from 'debug';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { AuthManager } from '../../auth/AuthManager';
import { authenticate, requireAdmin } from '../../auth/middleware';
import type { AuthMiddlewareRequest, LoginCredentials, RegisterData } from '../../auth/types';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import { apiRateLimiter, authRateLimiter } from '../../middleware/rateLimiters';
import { HTTP_STATUS } from '../../types/constants';
import { ErrorUtils } from '../../types/errors';
import { validateRequest as validate } from '../../validation/validateRequest';
import { isTrustedAdminIP } from '../middleware/security';
import {
  ChangePasswordSchema,
  LoginSchema,
  LogoutSchema,
  RefreshTokenSchema,
  RegisterSchema,
  UpdateProfileSchema,
  UpdateUserSchema,
  UserIdParamSchema,
  VerifyTokenSchema,
} from '../schemas/auth.schemas';
import { ApiResponse } from '../utils/apiResponse';

const debug = Debug('app:api:auth');
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
      const authResult = await authManager.login(credentials);
      return res.json(ApiResponse.success(authResult));
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      debug('Login error:', errMsg);
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(ApiResponse.error(ErrorUtils.getMessage(error)));
    }
  })
);

/**
 * @openapi
 * /webui/api/auth/register:
 *   post:
 *     summary: Register a new user (Admin only)
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
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(ErrorUtils.getMessage(error)));
    }
  })
);

/**
 * @openapi
 * /webui/api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 */
router.post(
  '/refresh',
  apiRateLimiter,
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
        .json(ApiResponse.error(ErrorUtils.getMessage(error)));
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
 *       required: true
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
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(ErrorUtils.getMessage(error)));
    }
  })
);

/**
 * @openapi
 * /webui/api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 */
router.get(
  '/me',
  authenticate,
  asyncErrorHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthMiddlewareRequest;
    if (!authReq.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(ApiResponse.error('Not authenticated'));
    }

    return res.json(ApiResponse.success({ user: authReq.user }));
  })
);

/**
 * @openapi
 * /webui/api/auth/verify:
 *   post:
 *     summary: Verify a token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token: { type: string }
 *             required: [token]
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/verify',
  apiRateLimiter,
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

      // eslint-disable-next-line unused-imports/no-unused-vars
    } catch (_: unknown) {
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(ApiResponse.error('Invalid token', undefined, 401));
    }
  })
);

// GET /api/auth/verify - Verify JWT token from Authorization header
router.get('/verify', apiRateLimiter, async (req: Request, res: Response) => {
  try {
    if (process.env.ALLOW_TEST_BYPASS === 'true') {
      return res.json(
        ApiResponse.success({
          user: {
            id: 'test-admin',
            username: 'admin',
            role: 'admin',
            permissions: ['*'],
          },
        })
      );
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json(ApiResponse.error('Bearer token required'));
    }

    const token = authHeader.split(' ')[1];
    const payload = authManager.verifyAccessToken(token);
    const user = authManager.getUser((payload as Record<string, unknown>).userId as string);

    if (!user) {
      return res.status(401).json(ApiResponse.error('User not found'));
    }

    return res.json(ApiResponse.success({ user, tokenValid: true }));
  } catch {
    return res.status(401).json(ApiResponse.error('Invalid or expired token'));
  }
});

// GET /api/auth/trusted-status — check if request comes from trusted IP
// Uses apiRateLimiter (not authRateLimiter) — this is a lightweight status check, not a credential endpoint

const safeApiLimiter =
  apiRateLimiter || ((_req: Request, _res: Response, next: NextFunction) => next());
router.get('/trusted-status', safeApiLimiter, (req: Request, res: Response) => {
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
    return res.status(401).json(ApiResponse.error(ErrorUtils.getMessage(error)));
  }
});

/**
 * @openapi
 * /webui/api/auth/profile:
 *   patch:
 *     summary: Update current user profile
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
 *               email: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.patch(
  '/profile',
  authenticate,
  validate(UpdateProfileSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthMiddlewareRequest;
    if (!authReq.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(ApiResponse.error('Not authenticated'));
    }

    const user = await authManager.updateUser(authReq.user.id, req.body);
    return res.json(ApiResponse.success({ user }));
  })
);

/**
 * @openapi
 * /webui/api/auth/password:
 *   post:
 *     summary: Change user password
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
 *               oldPassword: { type: string }
 *               newPassword: { type: string }
 *             required: [oldPassword, newPassword]
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.post(
  '/password',
  authenticate,
  validate(ChangePasswordSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthMiddlewareRequest;
    if (!authReq.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(ApiResponse.error('Not authenticated'));
    }

    const { oldPassword, newPassword } = req.body;

    try {
      // Verify old password first using refactored method
      const isPasswordValid = await authManager.verifyCurrentPassword(authReq.user.id, oldPassword);

      if (!isPasswordValid) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json(ApiResponse.error('Invalid old password'));
      }
      if (!isPasswordValid) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json(ApiResponse.error('Invalid old password'));
      }

      const success = await authManager.changePassword(authReq.user.id, newPassword);
      if (success) {
        return res.json(ApiResponse.success({ message: 'Password changed successfully' }));
      } else {
        return res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(ApiResponse.error('Failed to change password'));
      }
    } catch (error: unknown) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(ErrorUtils.getMessage(error)));
    }
  })
);

/**
 * GET /webui/api/auth/users
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
 */
router.delete(
  '/users/:userId',
  authenticate,
  requireAdmin,
  validate(UserIdParamSchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthMiddlewareRequest;
    if (!authReq.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(ApiResponse.error('Not authenticated'));
    }

    try {
      const { userId } = req.params;
      if (authReq.user.id === userId) {
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
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(ErrorUtils.getMessage(error)));
    }
  }
);

/**
 * GET /webui/api/auth/permissions
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
