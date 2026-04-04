import Debug from 'debug';
import { http } from '@hivemind/shared-types';

const debug = Debug('app:flowiseCommand');

export class FlowiseCommand {
  name = 'flowise';
  description =
    'Interact with the Flowise API to retrieve information based on the provided endpoint ID.';

  /**
   * Executes the Flowise API command.
   * @param args The command arguments, including an optional endpointId.
   * @returns An object indicating the success of the operation, a message, and optionally any additional data.
   */
  async execute(args: {
    endpointId?: string;
  }): Promise<{ success: boolean; message: string; error?: string; data?: any }> {
    const { endpointId } = args;

    // Guard: Check if the API base URL is defined in the environment variables
    const apiUrl = process.env.FLOWISE_BASE_URL;
    if (!apiUrl) {
      const errorMessage = 'Flowise API base URL is not defined in the environment variables.';
      debug(errorMessage);
      return { success: false, message: errorMessage };
    }
    debug('Flowise API base URL: ' + apiUrl);

    // Guard: Ensure API key is provided
    const apiKey = process.env.FLOWISE_API_KEY;
    if (!apiKey) {
      const errorMessage = 'Flowise API key is missing.';
      debug(errorMessage);
      return { success: false, message: errorMessage };
    }
    debug('Flowise API Key: ' + apiKey);

    // Guard: Ensure endpointId is provided
    if (!endpointId) {
      const errorMessage = 'Endpoint ID is required but was not provided.';
      debug(errorMessage);
      return { success: false, message: errorMessage };
    }
    debug('Endpoint ID: ' + endpointId);

    // Construct the full API URL
    const url = apiUrl + endpointId;
    debug('Constructed Flowise API URL: ' + url);

    try {
      // Log the request headers for better debugging
      const headers = { Authorization: 'Bearer ' + apiKey };
      debug('Request Headers:', headers);

      // Make a GET request to the Flowise API
      const data = await http.get<unknown>(url, { headers });
      return { success: true, message: 'Request successful', data };
    } catch (error: unknown) {
      debug('Flowise API request failed: ' + (error instanceof Error ? error.message : error));
      return { success: false, message: 'Flowise API request failed', error: error instanceof Error ? error.message : String(error) };
    }
  }
}
