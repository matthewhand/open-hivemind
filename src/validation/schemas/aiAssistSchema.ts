import { z } from 'zod';

const MAX_PROMPT_LENGTH = 32000;
const MAX_SYSTEM_PROMPT_LENGTH = 16000;

/** POST /api/ai-assist/generate */
export const GenerateAIAssistSchema = z.object({
  body: z.object({
    prompt: z
      .string({ required_error: 'Prompt is required' })
      .min(1, { message: 'Prompt is required' })
      .max(MAX_PROMPT_LENGTH, {
        message: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`,
      }),
    systemPrompt: z
      .string()
      .max(MAX_SYSTEM_PROMPT_LENGTH, {
        message: `System prompt exceeds maximum length of ${MAX_SYSTEM_PROMPT_LENGTH} characters`,
      })
      .optional(),
  }),
});
