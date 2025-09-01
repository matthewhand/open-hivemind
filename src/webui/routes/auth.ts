import { Router, Request, Response } from 'express';
import { AuthManager, LoginCredentials, UserRole } from '@auth/AuthManager';

const router = Router();

// Login endpoint
router.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password }: LoginCredentials = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    const authManager = AuthManager.getInstance();
    const tokens = await authManager.authenticate({ username, password });

    if (!tokens) {
      return res.status(401).json({
        error: 'Invalid username or password'
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh token endpoint
router.post('/api/auth/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required'
      });
    }

    const authManager = AuthManager.getInstance();
    const tokens = authManager.refreshToken(refreshToken);

    if (!tokens) {
      return res.status(401).json({
        error: 'Invalid refresh token'
      });
    }

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      ...tokens
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Logout endpoint (client-side token removal)
router.post('/api/auth/logout', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Verify token endpoint
router.post('/api/auth/verify', (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token is required'
      });
    }

    const authManager = AuthManager.getInstance();
    const payload = authManager.verifyToken(token);

    if (!payload) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }

    const user = authManager.getUserById(payload.userId);
    if (!user) {
      return res.status(401).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
});

// Get current user profile
router.get('/api/auth/profile', (req: Request, res: Response) => {
  try {
    // This would typically get user from JWT middleware
    // For now, return a placeholder
    res.json({
      success: true,
      user: {
        id: 'placeholder',
        username: 'current-user',
        email: 'user@example.com',
        role: UserRole.USER,
        permissions: ['read:config', 'manage:bots']
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Create user (admin only)
router.post('/api/auth/users', async (req: Request, res: Response) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({
        error: 'All fields are required'
      });
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({
        error: 'Invalid role'
      });
    }

    const authManager = AuthManager.getInstance();
    const user = await authManager.createUser({
      username,
      email,
      password,
      role
    });

    res.json({
      success: true,
      message: 'User created successfully',
      user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create user'
    });
  }
});

// Get all users (admin only)
router.get('/api/auth/users', (req: Request, res: Response) => {
  try {
    const authManager = AuthManager.getInstance();
    const users = authManager.getAllUsers();

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Update user (admin only)
router.put('/api/auth/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const authManager = AuthManager.getInstance();
    const user = authManager.updateUser(userId, updates);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/api/auth/users/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const authManager = AuthManager.getInstance();
    const deleted = authManager.deleteUser(userId);

    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;