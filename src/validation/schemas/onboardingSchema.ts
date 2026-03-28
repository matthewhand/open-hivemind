import { z } from 'zod';

/** Schema for POST /api/onboarding/step — update current step */
export const OnboardingStepSchema = z.object({
  body: z.object({
    step: z
      .number({ required_error: 'step is required', invalid_type_error: 'step must be a number' })
      .int()
      .min(1, { message: 'step must be between 1 and 5' })
      .max(5, { message: 'step must be between 1 and 5' }),
  }),
});
