import type { Request } from 'express';

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

export interface AuthMiddlewareRequest<
  Params = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = Record<string, unknown>,
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user?: User;
  permissions?: string[];
  body: ReqBody;
  params: Params;
  query: ReqQuery;
}

export interface PermissionCheck {
  resource: string;
  action: string;
  userId?: string;
}

export interface PermissionResult {
  granted: boolean;
  reason?: string;
}
