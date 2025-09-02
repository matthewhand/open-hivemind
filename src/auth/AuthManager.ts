import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import Debug from 'debug';
import { User, UserRole, AuthToken, LoginCredentials, RegisterData } from './types';
import { SecureConfigManager } from '@config/SecureConfigManager';

const debug = Debug('app:AuthManager');

export class AuthManager {
  private static instance: AuthManager;
  private users: Map<string, User> = new Map();
  private refreshTokens: Set<string> = new Set();
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly bcryptRounds = 12;

  // RBAC Permissions
  private readonly rolePermissions: Record<UserRole, string[]> = {
    admin: [
      'config:read', 'config:write', 'config:delete',
      'bots:read', 'bots:write', 'bots:delete', 'bots:manage',
      'users:read', 'users:write', 'users:delete',
      'system:read', 'system:write', 'system:admin',
      'backup:read', 'backup:write', 'backup:delete'
    ],
    user: [
      'config:read',
      'bots:read', 'bots:write',
      'system:read'
    ],
    viewer: [
      'config:read',
      'bots:read',
      'system:read'
    ]
  };

  private constructor() {
    // Generate secure JWT secrets
    this.jwtSecret = this.generateSecureSecret('jwt_access');
    this.jwtRefreshSecret = this.generateSecureSecret('jwt_refresh');

    // Create default admin user synchronously
    this.initializeDefaultAdminSync();

    debug('AuthManager initialized with secure JWT secrets');
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Generate a secure random secret for JWT
   */
  private generateSecureSecret(prefix: string): string {
    const secret = crypto.randomBytes(64).toString('hex');
    // Store securely using SecureConfigManager
    const secureConfig = SecureConfigManager.getInstance();
    secureConfig.storeConfig({
      id: `${prefix}_secret`,
      name: `${prefix} Secret`,
      type: 'auth',
      data: { secret },
      createdAt: new Date().toISOString()
    } as any).catch(err => {
      debug(`Failed to store ${prefix} secret securely:`, err);
    });

    return secret;
  }

  /**
   * Initialize default admin user synchronously
   */
  private initializeDefaultAdminSync(): void {
    // Use bcrypt.hashSync for synchronous initialization
    const defaultAdmin: User = {
      id: 'admin',
      username: 'admin',
      email: 'admin@localhost',
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      passwordHash: bcrypt.hashSync('admin123!', this.bcryptRounds)
    };

    this.users.set('admin', defaultAdmin);
    debug('Default admin user created');
  }

  /**
   * Hash password using bcrypt
   */
  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptRounds);
  }

  /**
   * Verify password against hash
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Register a new user
   */
  public async register(data: RegisterData): Promise<User> {
    // Validate password strength
    if (!data.password || data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    
    // Check if user already exists by username
    const existingUserByUsername = Array.from(this.users.values()).find(u => u.username === data.username);
    if (existingUserByUsername) {
      throw new Error('User already exists');
    }
    
    // Check if user already exists by email
    const existingUserByEmail = Array.from(this.users.values()).find(u => u.email === data.email);
    if (existingUserByEmail) {
      throw new Error('User already exists');
    }

    const user: User = {
      id: crypto.randomUUID(),
      username: data.username,
      email: data.email,
      role: data.role || 'user',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      passwordHash: await this.hashPassword(data.password)
    };

    this.users.set(user.id, user);
    debug(`User registered: ${user.username}`);

    return { ...user, passwordHash: undefined }; // Don't return password hash
  }

  /**
   * Authenticate user and generate tokens
   */
  public async login(credentials: LoginCredentials): Promise<AuthToken> {
    const user = Array.from(this.users.values()).find(
      u => u.username === credentials.username && u.isActive
    );

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await this.verifyPassword(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    this.users.set(user.id, user);

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Store refresh token
    this.refreshTokens.add(refreshToken);

    debug(`User logged in: ${user.username}`);

    return {
      accessToken,
      refreshToken,
      user: { ...user, passwordHash: undefined },
      expiresIn: 3600 // 1 hour
    };
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshToken(refreshToken: string): Promise<AuthToken> {
    if (!this.refreshTokens.has(refreshToken)) {
      throw new Error('Invalid refresh token');
    }

    try {
      const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;
      const user = this.users.get(payload.userId);

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      // Remove old refresh token and add new one
      this.refreshTokens.delete(refreshToken);
      this.refreshTokens.add(newRefreshToken);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: { ...user, passwordHash: undefined },
        expiresIn: 3600
      };
    } catch (error) {
      this.refreshTokens.delete(refreshToken);
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user by invalidating refresh token
   */
  public async logout(refreshToken: string): Promise<void> {
    this.refreshTokens.delete(refreshToken);
    debug('User logged out');
  }

  /**
   * Generate JWT access token
   */
  private generateAccessToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        permissions: this.getUserPermissions(user.role)
      },
      this.jwtSecret,
      { expiresIn: '1h' }
    );
  }

  /**
   * Generate JWT refresh token
   */
  private generateRefreshToken(user: User): string {
    return jwt.sign(
      { userId: user.id },
      this.jwtRefreshSecret,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verify JWT access token
   */
  public verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  /**
   * Get user permissions based on role
   */
  public getUserPermissions(role: UserRole): string[] {
    return this.rolePermissions[role] || [];
  }

  /**
   * Check if user has permission
   */
  public hasPermission(userRole: UserRole, permission: string): boolean {
    const permissions = this.getUserPermissions(userRole);
    return permissions.includes(permission);
  }

  /**
   * Get user by ID
   */
  public getUser(userId: string): User | null {
    const user = this.users.get(userId);
    if (user) {
      return { ...user, passwordHash: undefined };
    }
    return null;
  }

  /**
   * Get all users (admin only)
   */
  public getAllUsers(): User[] {
    return Array.from(this.users.values()).map(user => ({
      ...user,
      passwordHash: undefined
    }));
  }

  /**
   * Update user
   */
  public updateUser(userId: string, updates: Partial<User>): User | null {
    const user = this.users.get(userId);
    if (!user) return null;

    const updatedUser = { ...user, ...updates };
    this.users.set(userId, updatedUser);

    return { ...updatedUser, passwordHash: undefined };
  }

  /**
   * Delete user
   */
  public deleteUser(userId: string): boolean {
    return this.users.delete(userId);
  }

  /**
   * Change user password
   */
  public async changePassword(userId: string, newPassword: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    user.passwordHash = await this.hashPassword(newPassword);
    this.users.set(userId, user);

    return true;
  }
}