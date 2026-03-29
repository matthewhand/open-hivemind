import { z } from 'zod';
import { idParam } from './commonSchema';

const endpointConfigBody = z.object({
  id: z.string().min(1, { message: 'Endpoint id is required' }),
  name: z.string().min(1, { message: 'Endpoint name is required' }),
  url: z.string().url({ message: 'A valid URL is required' }),
  method: z.string().optional(),
  enabled: z.boolean().optional(),
  interval: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
  retries: z.number().int().nonnegative().optional(),
  retryDelay: z.number().int().nonnegative().optional(),
});

/** POST /cleanup or POST /api-endpoints */
export const CreateApiEndpointSchema = z.object({
  body: endpointConfigBody,
});

/** PUT /api-endpoints/:id */
export const UpdateApiEndpointSchema = z.object({
  params: z.object({
    id: idParam('Endpoint ID'),
  }),
  body: z.record(z.unknown()).refine((val) => Object.keys(val).length > 0, {
    message: 'Update body must not be empty',
  }),
});

/** DELETE /api-endpoints/:id */
export const DeleteApiEndpointSchema = z.object({
  params: z.object({
    id: idParam('Endpoint ID'),
  }),
});
