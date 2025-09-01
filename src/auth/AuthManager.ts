import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import Debug from 'debug';
import * as fs from 'fs';
import * as path from 'path';

const debug = Debug('app:AuthManager');

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  permissions: string[];
  passwordHash?: string; // Only present internally, not in API responses
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer'
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
  permissions: string[];
  iat: number;
  exp: number;
}

export class AuthManager {
  private static instance: AuthManager;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private usersFile: string;
  private users: Map<string, User> = new Map();

  private constructor() {
    this.jwtSecret = this.getOrCreateJWTSecret();
    this.jwtRefreshSecret = this.getOrCreateJWTRefreshSecret();
    this.usersFile = path.join(process.cwd(), 'config', 'users.json');
    this.ensureUsersFile();
    this.loadUsers();
    this.ensureDefaultAdmin();
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  private getOrCreateJWTSecret(): string {
    const secretFile = path.join(process.cwd(), 'config', '.jwt_secret');
    if (fs.existsSync(secretFile)) {
      return fs.readFileSync(secretFile, 'utf-8').trim();
    } else {
      const secret = crypto.randomBytes(64).toString('hex');
      fs.writeFileSync(secretFile, secret, { mode: 0o600 });
      debug('Generated new JWT secret');
      return secret;
    }
  }

  private getOrCreateJWTRefreshSecret(): string {
    const secretFile = path.join(process.cwd(), 'config', '.jwt_refresh_secret');
    if (fs.existsSync(secretFile)) {
      return fs.readFileSync(secretFile, 'utf-8').trim();
    } else {
      const secret = crypto.randomBytes(64).toString('hex');
      fs.writeFileSync(secretFile, secret, { mode: 0o600 });
      debug('Generated new JWT refresh secret');
      return secret;
    }
  }

  private ensureUsersFile(): void {
    const configDir = path.dirname(this.usersFile);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    if (!fs.existsSync(this.usersFile)) {
      fs.writeFileSync(this.usersFile, JSON.stringify([]), { mode: 0o600 });
    }
  }

  private loadUsers(): void {
    try {
      const data = JSON.parse(fs.readFileSync(this.usersFile, 'utf-8'));
      this.users = new Map(data.map((user: User) => [user.id, user]));
      debug(`Loaded ${this.users.size} users`);
    } catch (error) {
      debug('Failed to load users:', error);
      this.users = new Map();
    }
  }

  private saveUsers(): void {
    try {
      const usersArray = Array.from(this.users.values());
      fs.writeFileSync(this.usersFile, JSON.stringify(usersArray, null, 2), { mode: 0o600 });
      debug(`Saved ${this.users.size} users`);
    } catch (error) {
      debug('Failed to save users:', error);
      throw new Error('Failed to save user data');
    }
  }

  private ensureDefaultAdmin(): void {
    const adminExists = Array.from(this.users.values()).some(user =>
      user.role === UserRole.ADMIN && user.isActive
    );

    if (!adminExists) {
      debug('Creating default admin user');
      this.createUser({
        username: 'admin',
        email: 'admin@open-hivemind.local',
        password: 'admin123!',
        role: UserRole.ADMIN
      });
    }
  }

  public async createUser(userData: {
    username: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<User> {
    // Check if username or email already exists
    const existingUser = Array.from(this.users.values()).find(user =>
      user.username === userData.username || user.email === userData.email
    );

    if (existingUser) {
      throw new Error('Username or email already exists');
    }

    const user: User = {
      id: crypto.randomBytes(16).toString('hex'),
      username: userData.username,
      email: userData.email,
      role: userData.role,
      isActive: true,
      createdAt: new Date().toISOString(),
      permissions: this.getPermissionsForRole(userData.role)
    };

    // Hash password
    const saltRounds = 12;
    user.passwordHash = await bcrypt.hash(userData.password, saltRounds);

    this.users.set(user.id, user);
    this.saveUsers();

    // Remove password hash from returned user object
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  public async authenticate(credentials: LoginCredentials): Promise<AuthTokens | null> {
    const user = Array.from(this.users.values()).find(u =>
      u.username === credentials.username && u.isActive
    );

    if (!user || !user.passwordHash) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    this.saveUsers();

    return this.generateTokens(user);
  }

  private generateTokens(user: User): AuthTokens {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId: user.id }, this.jwtRefreshSecret, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600 // 1 hour
    };
  }

  public verifyToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload;
      return payload;
    } catch (error) {
      debug('Token verification failed:', error);
      return null;
    }
  }

  public refreshToken(refreshToken: string): AuthTokens | null {
    try {
      const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as { userId: string };
      const user = this.users.get(payload.userId);

      if (!user || !user.isActive) {
        return null;
      }

      return this.generateTokens(user);
    } catch (error) {
      debug('Refresh token verification failed:', error);
      return null;
    }
  }

  public getUserById(userId: string): User | null {
    const user = this.users.get(userId);
    if (!user) return null;

    // Remove password hash from returned user object
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  public getAllUsers(): User[] {
    return Array.from(this.users.values()).map(user => {
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    });
  }

  public updateUser(userId: string, updates: Partial<User>): User | null {
    const user = this.users.get(userId);
    if (!user) return null;

    Object.assign(user, updates);
    user.permissions = this.getPermissionsForRole(user.role);
    this.saveUsers();

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  public deleteUser(userId: string): boolean {
    const deleted = this.users.delete(userId);
    if (deleted) {
      this.saveUsers();
    }
    return deleted;
  }

  private getPermissionsForRole(role: UserRole): string[] {
    switch (role) {
      case UserRole.ADMIN:
        return [
          'read:config',
          'write:config',
          'delete:config',
          'manage:bots',
          'manage:users',
          'view:logs',
          'system:admin'
        ];
      case UserRole.USER:
        return [
          'read:config',
          'write:config',
          'manage:bots',
          'view:logs'
        ];
      case UserRole.VIEWER:
        return [
          'read:config',
          'view:logs'
        ];
      default:
        return [];
    }
  }

  public hasPermission(user: User, permission: string): boolean {
    return user.permissions.includes(permission);
  }

  public hasRole(user: User, role: UserRole): boolean {
    return user.role === role;
  }
}