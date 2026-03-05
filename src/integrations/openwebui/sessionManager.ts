import axios from 'axios';
import Debug from 'debug';
import openWebUIConfig from './openWebUIConfig';

const debug = Debug('app:sessionManager');
let sessionKey: string | null = null; // Cache session key in memory.
let sessionKeyPromise: Promise<string> | null = null; // Track in-flight authentication requests.

/**
 * Fetches a new session key from Open WebUI using the configured username and password.
 * Throws an error if authentication fails.
 *
 * This function is concurrency-safe: multiple simultaneous calls will share
 * the same authentication request and return the same session key.
 *
 * @returns {Promise<string>} The session key.
 */
export async function getSessionKey(): Promise<string> {
  // Return cached key if available
  if (sessionKey) {
    debug('Using cached session key');
    return sessionKey;
  }

  // If there's already an in-flight request, wait for it instead of making a duplicate
  if (sessionKeyPromise) {
    debug('Waiting for in-flight authentication request');
    return sessionKeyPromise;
  }

  // Create a new authentication promise
  sessionKeyPromise = authenticateAndGetKey();

  try {
    const key = await sessionKeyPromise;
    sessionKey = key;
    return key;
  } finally {
    // Clear the in-flight promise so future calls can retry if needed
    sessionKeyPromise = null;
  }
}

/**
 * Internal function to perform authentication.
 * Separated from getSessionKey to enable promise deduplication.
 */
async function authenticateAndGetKey(): Promise<string> {
  const { apiUrl, username, password } = openWebUIConfig.getProperties();

  debug('Requesting new session key for:', username);

  try {
    const response = await axios.post(
      apiUrl + '/auth/login',
      { username, password },
      { timeout: 15000 }
    );

    const newSessionKey = response.data.sessionKey;

    if (!newSessionKey) {
      throw new Error('Failed to obtain a valid session key.');
    }

    debug('New session key obtained successfully');
    return newSessionKey;
  } catch (error) {
    debug('Failed to obtain session key:', error);
    throw new Error('Authentication failed');
  }
}

/**
 * Clears the cached session key, forcing a re-authentication on the next request.
 *
 * This will also cancel any in-flight authentication request, causing it to fail
 * if it hasn't completed yet.
 */
export async function refreshSessionKey(): Promise<void> {
  debug('Refreshing session key...');
  sessionKey = null;
  sessionKeyPromise = null;
  await getSessionKey(); // Fetch new session key immediately.
}
