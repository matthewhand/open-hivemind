export type UserRole = 'admin' | 'user' | 'viewer';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  passwordHash?: string; // Only included when needed for auth operations
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface AuthMiddlewareRequest extends Request {
  user?: User;
  permissions?: string[];
}

export interface PermissionCheck {
  resource: string;
  action: string;
  userId?: string;
}

export type PermissionResult = {
  granted: boolean;
  reason?: string;
};