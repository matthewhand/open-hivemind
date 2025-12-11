import { z } from 'zod';

export const GuardSchema = z.object({
  type: z.enum(['owner', 'users', 'ip']),
  users: z.array(z.string()).optional(),
  ips: z.array(z.string().ip()).optional(),
});