import { z } from 'zod';
import { idParam } from './commonSchema';

/** POST /api/anomalies/:id/resolve */
export const ResolveAnomalySchema = z.object({
  params: z.object({
    id: idParam('Anomaly ID'),
  }),
});
