import Debug from 'debug';
import { HivemindError, ErrorUtils } from '@src/types/errors';

const debug = Debug('app:generateResponse');

/**
 * Generates an AI response for a given message.
 * @param {string} transcript - The transcript of the message to generate a response to.
 * @returns {Promise<string>} A promise that resolves to the generated response.
 */
export async function generateResponse(transcript: string): Promise<string> {
  try {
    // Placeholder for actual response generation logic
    const response = `AI-generated response for: ${transcript}`;
    debug('Generated response: ' + response);
    return response;
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);

    debug('Error generating response: ' + ErrorUtils.getMessage(hivemindError));

    // Log with appropriate level
    if (classification.logLevel === 'error') {
      console.error('Discord generate response error:', hivemindError);
    }

    return 'Sorry, an error occurred while generating a response.';
  }
}
