/**
 * Fetch wrapper that automatically includes auth headers from localStorage.
 * Use this instead of raw fetch() for any /api/* calls.
 */
export function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  };
  try {
    const stored = localStorage.getItem('auth_tokens');
    if (stored && stored !== 'undefined') {
      const tokens = JSON.parse(stored);
      if (tokens.accessToken) headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }
  } catch { /* ignore parse errors */ }
  return fetch(url, { ...opts, headers });
}
