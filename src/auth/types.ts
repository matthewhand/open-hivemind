import type { Request } from 'express';

export type UserRole = 'admin' | 'bot-manager' | 'user' | 'viewer';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  passwordHash?: string; // Only included when needed for auth operations
  tenantId?: string; // Used for multi-tenant applications
  /**
   * Whether TOTP-based two-factor authentication is active for this user.
   * Opt-in per user; absent/false means 2FA is not required at login.
   */
  twoFactorEnabled?: boolean;
  /**
   * Confirmed Base32 TOTP secret. Only present once enrollment is verified.
   * Stripped from any user object returned to clients.
   */
  twoFactorSecret?: string;
  /**
   * Base32 TOTP secret generated during enrollment but not yet confirmed.
   * Promoted to `twoFactorSecret` only after a valid code is supplied.
   */
  twoFactorPendingSecret?: string;
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
  /**
   * TOTP code, required only when the target user has 2FA enabled.
   * Optional so existing password-only logins are unaffected.
   */
  totpCode?: string;
  /**
   * Optional client IP address. When supplied, account-lockout tracking is
   * keyed on the username + IP pair so a single abusive source cannot lock out
   * a legitimate user logging in from a different network.
   */
  ipAddress?: string;
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
  ResBody = unknown,
  ReqBody = unknown,
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
