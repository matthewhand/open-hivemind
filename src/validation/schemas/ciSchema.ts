import { z } from 'zod';
import { idParam } from './commonSchema';

/** POST /api/deployments — create a new deployment */
export const CreateDeploymentSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Deployment name is required' }),
    environment: z.string().min(1, { message: 'Environment is required' }),
    branch: z.string().optional(),
    commitHash: z.string().optional(),
  }),
});

/** POST /api/deployments/:id/rollback */
export const RollbackDeploymentSchema = z.object({
  params: z.object({
    id: idParam('Deployment ID'),
  }),
});

/** POST /api/deployments/validate */
export const ValidateDeploymentSchema = z.object({
  body: z.object({
    environment: z.string().min(1, { message: 'Environment is required' }),
    configuration: z.record(z.unknown()).refine((val) => Object.keys(val).length > 0, {
      message: 'Configuration must be a non-empty object',
    }),
  }),
});

/** POST /api/tests/run */
export const RunTestsSchema = z.object({
  body: z.object({
    type: z.string().optional(),
    environment: z.string().optional(),
  }),
});
