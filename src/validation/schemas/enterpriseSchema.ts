import { z } from 'zod';

/** Schema for POST /api/cloud-providers */
export const CreateCloudProviderSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    type: z.string().min(1, { message: 'Type is required' }),
    region: z.string().min(1, { message: 'Region is required' }),
  }),
});

/** Schema for POST /api/integrations (enterprise) */
export const CreateEnterpriseIntegrationSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    type: z.string().min(1, { message: 'Type is required' }),
    provider: z.string().min(1, { message: 'Provider is required' }),
    config: z.record(z.any()).optional(),
  }),
});

/** Schema for POST /api/performance/optimize */
export const PerformanceOptimizeSchema = z.object({
  body: z.object({
    target: z.string().optional(),
    type: z.string().optional(),
  }),
});
