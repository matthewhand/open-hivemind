import { Router, Request, Response } from 'express';
import { AuthManager } from '../../auth/AuthManager';
import { authenticate, requireAdmin } from '../../auth/middleware';
import { LoginCredentials, RegisterData, AuthMiddlewareRequest } from '../../auth/types';
import Debug from 'debug';

const debug = Debug('app:AuthRoutes');
const router = Router();
const authManager = AuthManager.getInstance();

/**
 * POST /webui/api/auth/login
 * User login endpoint
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const credentials: LoginCredentials = req.body;

    if (!credentials.username || !credentials.password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Username and password are required'
      });
    }

    const authResult = await authManager.login(credentials);

    res.json({
      success: true,
      data: authResult,
      message: 'Login successful'
    });
  } catch (error: any) {
    debug('Login error:', error.message);
    res.status(401).json({
      error: 'Authentication failed',
      message: error.message || 'Invalid credentials'
    });
  }
});

/**
 * POST /webui/api/auth/register
 * User registration endpoint (admin only)
 */
router.post('/register', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const registerData: RegisterData = req.body;

    if (!registerData.username || !registerData.email || !registerData.password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Username, email, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerData.email)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid email format'
      });
    }

    // Validate password strength
    if (registerData.password.length < 8) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 8 characters long'
      });
    }

    const user = await authManager.register(registerData);

    res.status(201).json({
      success: true,
      data: { user },
      message: 'User registered successfully'
    });
  } catch (error: any) {
    debug('Registration error:', error.message);
    res.status(400).json({
      error: 'Registration failed',
      message: error.message || 'Failed to register user'
    });
  }
});

/**
 * POST /webui/api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Refresh token is required'
      });
    }

    const authResult = await authManager.refreshToken(refreshToken);

    res.json({
      success: true,
      data: authResult,
      message: 'Token refreshed successfully'
    });
  } catch (error: any) {
    debug('Token refresh error:', error.message);
    res.status(401).json({
      error: 'Token refresh failed',
      message: error.message || 'Invalid refresh token'
    });
  }
});

/**
 * POST /webui/api/auth/logout
 * User logout endpoint
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await authManager.logout(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error: any) {
    debug('Logout error:', error.message);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
});

/**
 * GET /webui/api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  res.json({
    success: true,
    data: { user: authReq.user }
  });
});

/**
 * PUT /webui/api/auth/password
 * Change user password
 */
router.put('/password', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const { currentPassword, newPassword } = req.body;

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Current password and new password are required'
      });
    }

    // Verify current password
    const isValidCurrentPassword = await authManager.verifyPassword(
      currentPassword,
      req.user.passwordHash || ''
    );

    if (!isValidCurrentPassword) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Current password is incorrect'
      });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'New password must be at least 8 characters long'
      });
    }

    const success = await authManager.changePassword(req.user.id, newPassword);

    if (success) {
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } else {
      res.status(500).json({
        error: 'Password change failed',
        message: 'Failed to update password'
      });
    }
  } catch (error: any) {
    debug('Password change error:', error.message);
    res.status(500).json({
      error: 'Password change failed',
      message: 'An error occurred while changing password'
    });
  }
});

/**
 * GET /webui/api/auth/users
 * Get all users (admin only)
 */
router.get('/users', authenticate, requireAdmin, (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const users = authManager.getAllUsers();

    res.json({
      success: true,
      data: { users },
      total: users.length
    });
  } catch (error: any) {
    debug('Get users error:', error.message);
    res.status(500).json({
      error: 'Failed to get users',
      message: 'An error occurred while retrieving users'
    });
  }
});

/**
 * GET /webui/api/auth/users/:userId
 * Get specific user (admin only)
 */
router.get('/users/:userId', authenticate, requireAdmin, (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const { userId } = req.params;
    const user = authManager.getUser(userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: `User with ID ${userId} not found`
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error: any) {
    debug('Get user error:', error.message);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'An error occurred while retrieving user'
    });
  }
});

/**
 * PUT /webui/api/auth/users/:userId
 * Update user (admin only)
 */
router.put('/users/:userId', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Don't allow password updates through this endpoint
    delete updates.password;
    delete updates.passwordHash;

    const updatedUser = authManager.updateUser(userId, updates);

    if (!updatedUser) {
      return res.status(404).json({
        error: 'User not found',
        message: `User with ID ${userId} not found`
      });
    }

    res.json({
      success: true,
      data: { user: updatedUser },
      message: 'User updated successfully'
    });
  } catch (error: any) {
    debug('Update user error:', error.message);
    res.status(500).json({
      error: 'Failed to update user',
      message: 'An error occurred while updating user'
    });
  }
});

/**
 * DELETE /webui/api/auth/users/:userId
 * Delete user (admin only)
 */
router.delete('/users/:userId', authenticate, requireAdmin, (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const { userId } = req.params;

    // Prevent deleting self
    if (authReq.user && authReq.user.id === userId) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Cannot delete your own account'
      });
    }

    const deleted = authManager.deleteUser(userId);

    if (!deleted) {
      return res.status(404).json({
        error: 'User not found',
        message: `User with ID ${userId} not found`
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    debug('Delete user error:', error.message);
    res.status(500).json({
      error: 'Failed to delete user',
      message: 'An error occurred while deleting user'
    });
  }
});

/**
 * GET /webui/api/auth/permissions
 * Get current user permissions
 */
router.get('/permissions', authenticate, (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  if (!authReq.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'User not authenticated'
    });
  }

  const permissions = authManager.getUserPermissions(authReq.user.roles || ['user']);

  res.json({
    success: true,
    data: {
      roles: authReq.user.roles,
      permissions,
      user: authReq.user
    }
  });
});

export default router;