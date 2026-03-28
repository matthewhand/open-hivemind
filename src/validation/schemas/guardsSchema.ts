import { z } from 'zod';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ipCidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;

/** Schema for POST / — update access control guard config */
export const UpdateAccessControlSchema = z.object({
  body: z.object({
    type: z.enum(['owner', 'users', 'ip'], {
      message: 'Invalid access type. Must be owner, users, or ip',
    }),
    users: z
      .array(z.string().regex(emailRegex, { message: 'Invalid email format in users array' }))
      .optional(),
    ips: z
      .array(
        z.string().regex(ipCidrRegex, {
          message: 'Invalid IP address or CIDR notation in ips array',
        })
      )
      .optional(),
  }),
});

/** Schema for POST /:id/toggle — toggle guard enabled status */
export const ToggleGuardSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Guard ID is required' }),
  }),
  body: z.object({
    enabled: z.boolean({
      required_error: 'Enabled status is required and must be a boolean',
    }),
  }),
});
