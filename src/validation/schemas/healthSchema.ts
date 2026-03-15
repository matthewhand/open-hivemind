import { z } from 'zod';

export const ApiEndpointConfigSchema = z.object({
  body: z
    .object({
      id: z.string().min(1, 'id is required'),
      name: z.string().min(1, 'name is required'),
      url: z.string().min(1, 'url is required').url('Must be a valid URL'),
    })
    .passthrough(),
});
