import type { OpenAI } from 'openai';
import Debug from 'debug';
import { HivemindError, ErrorUtils } from '@src/types/errors';

const debug = Debug('app:OpenAiService');

/**
 * Lists all available models from OpenAI.
 *
 * @param openai - The OpenAI API client instance.
 * @returns {Promise<any>} - The list of available models.
 */
export async function listModels(openai: OpenAI): Promise<any> {
  try {
    const response = await openai.models.list();
    debug('Available models:', response.data);
    return response.data;
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);
        
    debug('Error listing models:', ErrorUtils.getMessage(hivemindError));
        
    // Log with appropriate level
    if (classification.logLevel === 'error') {
      console.error('OpenAI list models error:', hivemindError);
    }
        
    throw ErrorUtils.createError(
      `Failed to list models: ${ErrorUtils.getMessage(hivemindError)}`,
      classification.type,
      'OPENAI_LIST_MODELS_ERROR',
      ErrorUtils.getStatusCode(hivemindError),
      { originalError: error },
    );
  }
}
