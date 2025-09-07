import { AuthManager } from '../../src/auth/AuthManager';
import { User, UserRole } from '../../src/auth/types';

describe('AuthManager', () => {
  let authManager: AuthManager;

  beforeEach(() => {
    // Reset singleton instance for each test
    (AuthManager as any).instance = null;

    // Mock bcrypt to avoid native binary issues on ARM64 Linux
    jest.mock('bcrypt', () => ({
      hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
      compare: jest.fn().mockResolvedValue(true),
      genSalt: jest.fn().mockResolvedValue('$2b$10$salt'),
    }));

    authManager = AuthManager.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AuthManager.getInstance();
      const instance2 = AuthManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user' as UserRole
      };

      const user = await authManager.register(registerData);

      expect(user).toHaveProperty('id');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('user');
      expect(user.isActive).toBe(true);
      expect(user.passwordHash).toBeUndefined(); // Should not return password hash
    });

    it('should reject registration with existing username', async () => {
      const registerData1 = {
        username: 'testuser',
        email: 'test1@example.com',
        password: 'password123'
      };

      const registerData2 = {
        username: 'testuser',
        email: 'test2@example.com',
        password: 'password456'
      };

      await authManager.register(registerData1);

      await expect(authManager.register(registerData2)).rejects.toThrow('User already exists');
    });

    it('should reject registration with existing email', async () => {
      const registerData1 = {
        username: 'testuser1',
        email: 'test@example.com',
        password: 'password123'
      };

      const registerData2 = {
        username: 'testuser2',
        email: 'test@example.com',
        password: 'password456'
      };

      await authManager.register(registerData1);

      await expect(authManager.register(registerData2)).rejects.toThrow('User already exists');
    });

    it('should validate password strength', async () => {
      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123' // Too short
      };

      await expect(authManager.register(registerData)).rejects.toThrow();
    });
  });

  describe('User Authentication', () => {
    beforeEach(async () => {
      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      await authManager.register(registerData);
    });

    it('should authenticate user with correct credentials', async () => {
      const loginData = {
        username: 'testuser',
        password: 'password123'
      };

      const result = await authManager.login(loginData);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('expiresIn');
      expect(result.user.username).toBe('testuser');
      expect(result.expiresIn).toBe(3600); // 1 hour
    });

    it('should reject authentication with wrong password', async () => {
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      await expect(authManager.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should reject authentication with non-existent user', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'password123'
      };

      await expect(authManager.login(loginData)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Token Management', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      await authManager.register(registerData);

      const loginData = {
        username: 'testuser',
        password: 'password123'
      };

      const result = await authManager.login(loginData);
      accessToken = result.accessToken;
      refreshToken = result.refreshToken;
    });

    it('should verify valid access token', () => {
      const payload = authManager.verifyAccessToken(accessToken);

      expect(payload).toHaveProperty('userId');
      expect(payload).toHaveProperty('username', 'testuser');
      expect(payload).toHaveProperty('role', 'user');
      expect(payload).toHaveProperty('permissions');
    });

    it('should reject invalid access token', () => {
      expect(() => {
        authManager.verifyAccessToken('invalid-token');
      }).toThrow('Invalid access token');
    });

    it('should refresh access token with valid refresh token', async () => {
      const result = await authManager.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.username).toBe('testuser');
    });

    it('should reject refresh with invalid token', async () => {
      await expect(authManager.refreshToken('invalid-token')).rejects.toThrow('Invalid refresh token');
    });

    it('should logout and invalidate refresh token', async () => {
      await authManager.logout(refreshToken);

      // Should not be able to refresh with logged out token
      await expect(authManager.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should return correct permissions for admin role', () => {
      const permissions = authManager.getUserPermissions('admin');

      expect(permissions).toContain('config:read');
      expect(permissions).toContain('config:write');
      expect(permissions).toContain('users:read');
      expect(permissions).toContain('users:write');
      expect(permissions).toContain('system:admin');
    });

    it('should return correct permissions for user role', () => {
      const permissions = authManager.getUserPermissions('user');

      expect(permissions).toContain('config:read');
      expect(permissions).toContain('bots:read');
      expect(permissions).toContain('bots:write');
      expect(permissions).not.toContain('users:write');
      expect(permissions).not.toContain('system:admin');
    });

    it('should return correct permissions for viewer role', () => {
      const permissions = authManager.getUserPermissions('viewer');

      expect(permissions).toContain('config:read');
      expect(permissions).toContain('bots:read');
      expect(permissions).toContain('system:read');
      expect(permissions).not.toContain('config:write');
      expect(permissions).not.toContain('bots:write');
    });

    it('should check permission correctly', () => {
      expect(authManager.hasPermission('admin', 'config:write')).toBe(true);
      expect(authManager.hasPermission('user', 'config:write')).toBe(false);
      expect(authManager.hasPermission('viewer', 'config:read')).toBe(true);
      expect(authManager.hasPermission('viewer', 'config:write')).toBe(false);
    });
  });

  describe('User Management', () => {
    let userId: string;

    beforeEach(async () => {
      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      const user = await authManager.register(registerData);
      userId = user.id;
    });

    it('should get user by ID', () => {
      const user = authManager.getUser(userId);

      expect(user).toHaveProperty('id', userId);
      expect(user?.username).toBe('testuser');
      expect(user?.passwordHash).toBeUndefined();
    });

    it('should return null for non-existent user', () => {
      const user = authManager.getUser('non-existent-id');
      expect(user).toBeNull();
    });

    it('should get all users', () => {
      const users = authManager.getAllUsers();

      expect(users.length).toBeGreaterThan(0);
      expect(users[0]).toHaveProperty('username');
      expect(users[0].passwordHash).toBeUndefined();
    });

    it('should update user', () => {
      const updates = { email: 'newemail@example.com' };
      const updatedUser = authManager.updateUser(userId, updates);

      expect(updatedUser).toHaveProperty('email', 'newemail@example.com');
    });

    it('should return null when updating non-existent user', () => {
      const updates = { email: 'newemail@example.com' };
      const result = authManager.updateUser('non-existent-id', updates);

      expect(result).toBeNull();
    });

    it('should delete user', () => {
      const deleted = authManager.deleteUser(userId);
      expect(deleted).toBe(true);

      // Verify user is deleted
      const user = authManager.getUser(userId);
      expect(user).toBeNull();
    });

    it('should return false when deleting non-existent user', () => {
      const deleted = authManager.deleteUser('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should change user password', async () => {
      const success = await authManager.changePassword(userId, 'newpassword123');
      expect(success).toBe(true);

      // Verify new password works
      const loginResult = await authManager.login({
        username: 'testuser',
        password: 'newpassword123'
      });

      expect(loginResult).toHaveProperty('accessToken');
    });

    it('should return false when changing password for non-existent user', async () => {
      const success = await authManager.changePassword('non-existent-id', 'newpassword123');
      expect(success).toBe(false);
    });
  });

  describe('Default Admin User', () => {
    it('should have default admin user initialized', () => {
      const users = authManager.getAllUsers();
      const adminUser = users.find(u => u.username === 'admin');

      expect(adminUser).toBeDefined();
      expect(adminUser?.role).toBe('admin');
      expect(adminUser?.isActive).toBe(true);
    });

    it('should authenticate default admin user', async () => {
      const result = await authManager.login({
        username: 'admin',
        password: 'admin123!'
      });

      expect(result).toHaveProperty('accessToken');
      expect(result.user.role).toBe('admin');
    });
  });
});