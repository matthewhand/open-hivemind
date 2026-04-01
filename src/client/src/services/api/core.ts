/* eslint-disable @typescript-eslint/no-explicit-any */
import Debug from 'debug';
import type { RateLimitInfo, RateLimitListener } from './types';

const debug = Debug('app:client:services:api');

const getEnv = (key: string): string | undefined => {
  // Use a dynamic check to avoid Babel syntax errors with import.meta in CommonJS/Node
  try {
    // This string-based approach prevents static analysis/Babel from failing
    const env = (new Function('return import.meta.env'))();
    return env[key];
  } catch (e) {
    // Fallback to process.env for Node/Jest
    if (typeof process !== 'undefined' && process.env) {
      return (process.env as any)[key];
    }
    return undefined;
  }
};

const rawBaseUrl = getEnv('VITE_API_BASE_URL');
const API_BASE_URL = rawBaseUrl?.replace(/\/$/, '');

export const buildUrl = (endpoint: string): string => {
  // In development, if no API_BASE_URL is set, use relative URLs for local backend
  const isDev = getEnv('DEV') === 'true' || getEnv('NODE_ENV') === 'development';
  if (!API_BASE_URL && isDev) {
    return endpoint;
  }

  // Use the env var if set, otherwise default to empty string (relative path)
  // This allows the Netlify redirect to handle the proxying to the backend
  const baseUrl = API_BASE_URL || '';
  return `${baseUrl}${endpoint}`;
};

export class ApiService {
  private csrfToken: string | null = null;
  private csrfTokenPromise: Promise<string> | null = null;
  private inflightGets = new Map<string, Promise<any>>();
  private rateLimitListeners = new Set<RateLimitListener>();

  /**
   * Subscribe to rate limit header updates from API responses
   */
  public onRateLimitUpdate(listener: RateLimitListener): () => void {
    this.rateLimitListeners.add(listener);
    return () => { this.rateLimitListeners.delete(listener); };
  }

  /**
   * Extract rate limit headers from a response and notify listeners
   */
  private extractRateLimitHeaders(response: Response): void {
    // Try standard headers first (RateLimit-*), then legacy (X-RateLimit-*)
    const limit = response.headers.get('RateLimit-Limit')
      ?? response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('RateLimit-Remaining')
      ?? response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('RateLimit-Reset')
      ?? response.headers.get('X-RateLimit-Reset');

    if (limit !== null && remaining !== null) {
      const info: RateLimitInfo = {
        limit: parseInt(limit, 10) || 0,
        remaining: parseInt(remaining, 10) || 0,
        resetTime: reset ? parseInt(reset, 10) || 0 : 0,
      };
      this.rateLimitListeners.forEach(listener => {
        try {
          listener(info);
        } catch (_error) {
          debug('ERROR:', 'Rate limit listener error', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });
    }
  }

  /**
   * Fetch CSRF token from the server and cache it
   */
  private async fetchCsrfToken(): Promise<string> {
    // If already fetching, return the existing promise to avoid race conditions
    if (this.csrfTokenPromise) {
      return this.csrfTokenPromise;
    }

    const fetchPromise = (async (): Promise<string> => {
      try {
        const response = await fetch(buildUrl('/api/csrf-token'), {
          method: 'GET',
          credentials: 'same-origin',
        });

        if (!response.ok) {
          // CSRF endpoint not available (e.g., in dev mode or not configured)
          return '';
        }

        const data = await response.json();
        const token = data.token || data.csrfToken || '';
        this.csrfToken = token;
        return token;
      } catch (_error) {
        // Silently fail - CSRF may not be required in all environments
        console.debug('CSRF token fetch failed (may not be required):', error);
        return '';
      } finally {
        this.csrfTokenPromise = null;
      }
    })();

    this.csrfTokenPromise = fetchPromise;
    return fetchPromise;
  }

  /**
   * Get the current CSRF token, fetching it if necessary
   */
  private async getCsrfToken(): Promise<string> {
    if (this.csrfToken) {
      return this.csrfToken;
    }
    return this.fetchCsrfToken();
  }

  public async get<T>(endpoint: string, options?: RequestInit & { timeout?: number }): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public async post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  public async patch<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async getBlob(endpoint: string, options?: RequestInit): Promise<Blob> {
    const url = buildUrl(endpoint);
    const authHeaders = this.getAuthHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Blob request failed (${response.status}): ${response.statusText}`);
    }

    return response.blob();
  }

  public async getText(endpoint: string, options?: RequestInit): Promise<string> {
    const url = buildUrl(endpoint);
    const authHeaders = this.getAuthHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Text request failed (${response.status}): ${response.statusText}`);
    }

    return response.text();
  }

  public getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_tokens');
    const headers: Record<string, string> = {};

    if (token) {
      try {
        const tokens = JSON.parse(token);
        if (tokens.accessToken) {
          headers['Authorization'] = `Bearer ${tokens.accessToken}`;
        }
      } catch (e) {
        debug('ERROR:', 'Failed to parse auth token', e);
      }
    }
    return headers;
  }

  public async request<T>(endpoint: string, options?: RequestInit & { timeout?: number }): Promise<T> {
    const url = buildUrl(endpoint);
    const method = options?.method?.toUpperCase() || 'GET';

    if (method === 'GET') {
      const inflight = this.inflightGets.get(endpoint);
      if (inflight) return inflight as Promise<T>;
      const promise = this._doRequest<T>(url, endpoint, options).finally(() => {
        this.inflightGets.delete(endpoint);
      });
      this.inflightGets.set(endpoint, promise);
      return promise;
    }

    return this._doRequest<T>(url, endpoint, options);
  }

  private async _doRequest<T>(url: string, endpoint: string, options?: RequestInit & { timeout?: number }): Promise<T> {
    const method = options?.method?.toUpperCase() || 'GET';

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), options?.timeout || 15000); // Default 15s timeout

    try {
      const authHeaders = this.getAuthHeaders();

      // Add CSRF token for mutating requests (POST, PUT, DELETE, PATCH)
      const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
      if (mutatingMethods.includes(method)) {
        const csrfToken = await this.getCsrfToken();
        if (csrfToken) {
          authHeaders['X-CSRF-Token'] = csrfToken;
        }
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options?.headers,
        },
        signal: controller.signal,
      });
      clearTimeout(id);

      // Always extract rate limit headers, even from error responses
      this.extractRateLimitHeaders(response);

      if (!response.ok) {
        // Special handling for 429 Too Many Requests
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
          const body = await response.json().catch(() => ({})) as Record<string, unknown>;
          const err = new Error(
            (body.message as string) || `Rate limit exceeded. Retry after ${retrySeconds} seconds.`
          );
          (err as any).status = 429;
          (err as any).retryAfter = retrySeconds;
          (err as any).code = 'RATE_LIMIT_EXCEEDED';
          throw err;
        }

        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`API request failed (${response.status}): ${errorText.slice(0, 200)}`);
      }

      // Try to parse JSON, with graceful handling for non-JSON responses
      const text = await response.text();
      try {
        return JSON.parse(text) as T;
      } catch {
        // If response starts with HTML (common when API returns index.html fallback)
        if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
          throw new Error('Service temporarily unavailable. The server may still be starting up.');
        }
        throw new Error(`Invalid JSON response from server: ${text.slice(0, 100)}...`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${options?.timeout || 15000}ms`);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug('ERROR:', `API request failed for ${endpoint}:`, errorMessage);
      throw error;
    }
  }
}
