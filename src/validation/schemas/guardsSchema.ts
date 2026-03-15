import { z } from 'zod';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;

const validateIpOctets = (ip: string): boolean => {
  const parts = ip.split('/')[0].split('.');
  return parts.every((p) => {
    const num = parseInt(p, 10);
    return num >= 0 && num <= 255;
  });
};

export const UpdateAccessControlGuardSchema = z.object({
  body: z
    .object({
      type: z.enum(['owner', 'users', 'ip'], {
        required_error: 'type is required',
        invalid_type_error: 'Invalid access type. Must be owner, users, or ip',
      }),
      users: z.array(z.string().regex(emailRegex, 'Invalid email format')).optional(),
      ips: z
        .array(
          z
            .string()
            .regex(ipRegex, 'Invalid IP address or CIDR notation')
            .refine(validateIpOctets, 'Invalid IP octet range')
        )
        .optional(),
    })
    .passthrough(),
});

export const ToggleGuardSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Guard ID is required'),
  }),
  body: z
    .object({
      enabled: z.boolean({
        required_error: 'Enabled status is required',
        invalid_type_error: 'Enabled status must be a boolean',
      }),
    })
    .passthrough(),
});
