/**
 * Builds a URL by joining a base URL with path parts.
 * Handles trailing and leading slashes appropriately.
 * Filters out empty or undefined parts.
 *
 * @param baseUrl - The base URL (e.g., 'https://example.com/api')
 * @param pathParts - Variable number of path parts
 * @returns The constructed URL
 */
export function buildUrl(baseUrl: string, ...pathParts: (string | undefined)[]): string {
  const parts = pathParts
    .filter((part): part is string => part != null && part.trim() !== '')
    .map((part) => part.replace(/^\/+|\/+$/g, ''));

  if (parts.length === 0) {
    return baseUrl.replace(/\/$/, '');
  }

  const base = baseUrl.replace(/\/$/, '');
  const path = parts.join('/');
  return `${base}/${path}`;
}

/**
 * Normalizes a URL by removing trailing slash unless it's the root URL.
 *
 * @param url - The URL to normalize
 * @returns Normalized URL
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed === '/') {
    return '/';
  }
  return trimmed.replace(/\/$/, '');
}

/**
 * Ensures a URL has a trailing slash.
 *
 * @param url - The URL
 * @returns URL with trailing slash
 */
export function ensureTrailingSlash(url: string): string {
  const normalized = normalizeUrl(url);
  return normalized === '/' ? '/' : `${normalized}/`;
}

/**
 * Removes trailing slash from URL.
 *
 * @param url - The URL
 * @returns URL without trailing slash
 */
export function removeTrailingSlash(url: string): string {
  return normalizeUrl(url);
}

/**
 * Validates if a given string is a valid URL.
 *
 * @param url - The string to validate
 * @returns True if the URL is valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
