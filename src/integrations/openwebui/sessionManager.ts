import axios from 'axios';
import openWebUIConfig from './openWebUIConfig';
import Debug from 'debug';

const debug = Debug('app:sessionManager');
let sessionKey: string | null = null; // Cache session key in memory.

/**
 * Fetches a new session key from Open WebUI using the configured username and password.
 * Throws an error if authentication fails.
 * @returns {Promise<string>} The new session key.
 */
export async function getSessionKey(): Promise<string> {
  const { apiUrl, username, password } = openWebUIConfig.getProperties();

  if (sessionKey) {
    debug('Using cached session key:', sessionKey);
    return sessionKey; // Reuse cached session key.
  }

  debug('Requesting new session key for:', username);

  try {
    const response = await axios.post(apiUrl + '/auth/login', { username, password });
    sessionKey = response.data.sessionKey;

    if (!sessionKey) {
      throw new Error('Failed to obtain a valid session key.');
    }

    debug('New session key obtained:', sessionKey);
    return sessionKey;
  } catch (error) {
    debug('Failed to obtain session key:', error);
    throw new Error('Authentication failed');
  }
}

/**
 * Clears the cached session key, forcing a re-authentication on the next request.
 */
export async function refreshSessionKey(): Promise<void> {
  debug('Refreshing session key...');
  sessionKey = null;
  await getSessionKey(); // Fetch new session key immediately.
}
