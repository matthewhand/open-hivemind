import { z } from 'zod';

// Schema for login credentials
export const LoginSchema = z.object({
  body: z.object({
    username: z.string().min(1, { message: 'Username is required' }),
    password: z.string().min(1, { message: 'Password is required' }),
    // Optional TOTP code, only supplied when the account has 2FA enabled.
    totpCode: z
      .string()
      .regex(/^\d{6,8}$/, { message: 'Two-factor code must be 6-8 digits' })
      .optional(),
  }),
});

// Schema for confirming/verifying a TOTP code (enrollment confirmation).
export const TwoFactorCodeSchema = z.object({
  body: z.object({
    code: z.string().regex(/^\d{6,8}$/, { message: 'Two-factor code must be 6-8 digits' }),
  }),
});

// Schema for user registration
export const RegisterSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, { message: 'Username must be at least 3 characters' })
      .max(50, { message: 'Username must be less than 50 characters' })
      .regex(/^[a-zA-Z0-9_-]+$/, {
        message: 'Username can only contain letters, numbers, underscores, and hyphens',
      }),
    email: z.string().email({ message: 'Valid email is required' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message:
          'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      }),
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

// Schema for password change. `currentPassword` is canonical; `oldPassword`
// is accepted as a legacy alias so older clients keep working. At least one
// must be present (validated via refine so both can remain optional fields).
export const ChangePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, { message: 'Current password is required' }).optional(),
      oldPassword: z.string().min(1).optional(),
      newPassword: z
        .string()
        .min(8, { message: 'New password must be at least 8 characters' })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
          message:
            'New password must contain at least one lowercase letter, one uppercase letter, and one number',
        }),
    })
    .refine((data) => Boolean(data.currentPassword || data.oldPassword), {
      message: 'Current password is required',
      path: ['currentPassword'],
    }),
});

// Schema for user ID parameter
export const UserIdParamSchema = z.object({
  params: z.object({
    userId: z.string().min(1, { message: 'User ID is required' }),
  }),
});

// Schema for token verification
export const VerifyTokenSchema = z.object({
  body: z.object({
    token: z.string().min(1, { message: 'Token is required' }),
  }),
});

// Shared field validators for username / email on update payloads.
const optionalUsername = z
  .string()
  .min(3, { message: 'Username must be at least 3 characters' })
  .max(50, { message: 'Username must be less than 50 characters' })
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  })
  .optional();

const optionalEmail = z.string().email({ message: 'Valid email is required' }).optional();

// Schema for admin user updates (may change role)
export const UpdateUserSchema = z.object({
  body: z.object({
    username: optionalUsername,
    email: optionalEmail,
    role: z.enum(['user', 'admin']).optional(),
  }),
});

// Schema for self-service profile updates — NEVER accepts role or secrets.
// Unknown keys (including role) are stripped by Zod + validateRequest reassignment.
export const UpdateProfileSchema = z.object({
  body: z.object({
    username: optionalUsername,
    email: optionalEmail,
  }),
});
