import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { AuthManager } from '../../auth/AuthManager';
import { authenticate, requireAdmin } from '../../auth/middleware';
import type { AuthMiddlewareRequest, LoginCredentials, RegisterData } from '../../auth/types';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { validate } from '../middleware/validate';
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
  async (req: Request, res: Response) => {
    try {
      const credentials: LoginCredentials = req.body;
      // Normal authentication flow

      const authResult = await authManager.login(credentials);

      return res.json(ApiResponse.success(authResult));
    } catch (error: any) {
      debug('Login error:', error.message);
      return res.status(401).json(ApiResponse.error(error.message || 'Invalid credentials', undefined, 401));
    }
  }
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
  async (req: Request, res: Response) => {
    const authReq = req as AuthMiddlewareRequest;
    try {
      const registerData: RegisterData = req.body;

      const user = await authManager.register(registerData);

      return res.status(201).json(ApiResponse.success({ user }));
    } catch (error: any) {
      debug('Registration error:', error.message);
      return res.status(400).json(ApiResponse.error(error.message || 'Failed to register user', undefined, 400));
    }
  }
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
  authRateLimiter,
  validate(RefreshTokenSchema),
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      const authResult = await authManager.refreshToken(refreshToken);

      return res.json(ApiResponse.success(authResult));
    } catch (error: any) {
      debug('Token refresh error:', error.message);
      return res.status(401).json(ApiResponse.error(error.message || 'Invalid refresh token', undefined, 401));
    }
  }
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
  async (req: Request, res: Response) => {
    const authReq = req as AuthMiddlewareRequest;
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await authManager.logout(refreshToken);
      }

      return res.json(ApiResponse.success());
    } catch (error: any) {
      debug('Logout error:', error.message);
      return res.status(500).json(ApiResponse.error('Logout failed', undefined, 500));
    }
  }
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
  authRateLimiter,
  validate(VerifyTokenSchema),
  async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      const payload = authManager.verifyAccessToken(token);
      const user = authManager.getUser((payload as any).userId);
      if (!user) return res.status(401).json(ApiResponse.error('User not found', undefined, 401));
      return res.json(ApiResponse.success({ user }));
    } catch (error: any) {
      return res.status(401).json(ApiResponse.error('Invalid token', undefined, 401));
    }
  }
);

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
  async (req: Request, res: Response) => {
    const authReq = req as AuthMiddlewareRequest;
    try {
      const { currentPassword, newPassword } = req.body;

      if (!req.user) {
        return res.status(401).json(ApiResponse.error('Authentication required', undefined, 401));
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json(ApiResponse.error('Validation error', undefined, 400));
      }

      // Get user with password hash for verification
      const userWithHash = authManager.getUserWithHash(req.user.id);

      if (!userWithHash || !userWithHash.passwordHash) {
        return res.status(404).json(ApiResponse.error('User not found', undefined, 404));
      }

      // Verify current password
      const isValidCurrentPassword = await authManager.verifyPassword(
        currentPassword,
        userWithHash.passwordHash
      );

      if (!isValidCurrentPassword) {
        return res.status(400).json(ApiResponse.error('Validation error', undefined, 400));
      }

      // Validate new password
      if (newPassword.length < 8) {
        return res.status(400).json(ApiResponse.error('Validation error', undefined, 400));
      }

      const success = await authManager.changePassword(req.user.id, newPassword);

      if (success) {
        return res.json(ApiResponse.success());
      } else {
        return res.status(500).json(ApiResponse.error('Password change failed', undefined, 500));
      }
    } catch (error: any) {
      debug('Password change error:', error.message);
      return res.status(500).json(ApiResponse.error('Password change failed', undefined, 500));
    }
  }
);

/**
 * GET /webui/api/auth/users
 * Get all users (admin only)
 */
router.get('/users', authenticate, requireAdmin, (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const users = authManager.getAllUsers();

    return res.json(ApiResponse.success({ users }));
  } catch (error: any) {
    debug('Get users error:', error.message);
    return res.status(500).json(ApiResponse.error('Failed to get users', undefined, 500));
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
    const authReq = req as AuthMiddlewareRequest;
    try {
      const { userId } = req.params;
      const user = authManager.getUser(userId);

      if (!user) {
        return res.status(404).json(ApiResponse.error('User not found', undefined, 404));
      }

      return res.json(ApiResponse.success({ user }));
    } catch (error: any) {
      debug('Get user error:', error.message);
      return res.status(500).json(ApiResponse.error('Failed to get user', undefined, 500));
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
    const authReq = req as AuthMiddlewareRequest;
    try {
      const { userId } = req.params;
      const updates = req.body;

      // Don't allow password updates through this endpoint
      delete updates.password;
      delete updates.passwordHash;

      const updatedUser = authManager.updateUser(userId, updates);

      if (!updatedUser) {
        return res.status(404).json(ApiResponse.error('User not found', undefined, 404));
      }

      return res.json(ApiResponse.success({ user: updatedUser }));
    } catch (error: any) {
      debug('Update user error:', error.message);
      return res.status(500).json(ApiResponse.error('Failed to update user', undefined, 500));
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
        return res.status(400).json(ApiResponse.error('Invalid operation', undefined, 400));
      }

      const deleted = authManager.deleteUser(userId);

      if (!deleted) {
        return res.status(404).json(ApiResponse.error('User not found', undefined, 404));
      }

      return res.json(ApiResponse.success());
    } catch (error: any) {
      debug('Delete user error:', error.message);
      return res.status(500).json(ApiResponse.error('Failed to delete user', undefined, 500));
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
    return res.status(401).json(ApiResponse.error('Authentication required', undefined, 401));
  }

  const permissions = authManager.getUserPermissions(authReq.user.role);

  return res.json(ApiResponse.success({
      role: authReq.user.role,
      permissions,
      user: authReq.user,
    }));
});

export default router;
