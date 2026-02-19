import { z } from 'zod';

// Schema for login credentials
export const LoginSchema = z.object({
  body: z.object({
    username: z.string().min(1, { message: 'Username is required' }),
    password: z.string().min(1, { message: 'Password is required' }),
  }),
});

// Schema for user registration
export const RegisterSchema = z.object({
  body: z.object({
    username: z.string()
      .min(3, { message: 'Username must be at least 3 characters' })
      .max(50, { message: 'Username must be less than 50 characters' })
      .regex(/^[a-zA-Z0-9_-]+$/, { message: 'Username can only contain letters, numbers, underscores, and hyphens' }),
    email: z.string().email({ message: 'Valid email is required' }),
    password: z.string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number' }),
    role: z.enum(['user', 'admin']).optional().default('user'),
  }),
});

// Schema for token refresh
export const RefreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, { message: 'Refresh token is required' }),
  }),
});

// Schema for logout
export const LogoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

// Schema for password change
export const ChangePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, { message: 'Current password is required' }),
    newPassword: z.string()
      .min(8, { message: 'New password must be at least 8 characters' })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: 'New password must contain at least one lowercase letter, one uppercase letter, and one number' }),
  }),
});

// Schema for user ID parameter
export const UserIdParamSchema = z.object({
  params: z.object({
    userId: z.string().min(1, { message: 'User ID is required' }),
  }),
});

// Schema for user updates
export const UpdateUserSchema = z.object({
  body: z.object({
    username: z.string()
      .min(3, { message: 'Username must be at least 3 characters' })
      .max(50, { message: 'Username must be less than 50 characters' })
      .regex(/^[a-zA-Z0-9_-]+$/, { message: 'Username can only contain letters, numbers, underscores, and hyphens' })
      .optional(),
    email: z.string().email({ message: 'Valid email is required' }).optional(),
    role: z.enum(['user', 'admin']).optional(),
  }),
});