/**
 * Utility functions for API calls
 */

export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const stored = localStorage.getItem('auth_tokens');
    if (stored) {
      const parsed = JSON.parse(stored) as { accessToken?: string };
      if (parsed.accessToken) {
        headers.Authorization = `Bearer ${parsed.accessToken}`;
      }
    }
  } catch (error) {
    console.error('Failed to get auth tokens:', error);
  }
  return headers;
};
