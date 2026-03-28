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

/**
 * Builds a URL by joining a base with path segments,
 * stripping extra slashes between parts.
 */
export function buildUrl(base: string, ...parts: (string | undefined)[]): string {
  let result = base.replace(/\/+$/, '');
  for (const part of parts) {
    if (part === undefined || part.trim() === '') continue;
    const cleaned = part.replace(/^\/+/, '').replace(/\/+$/, '');
    if (cleaned) {
      result += '/' + cleaned;
    }
  }
  return result;
}

/**
 * Normalizes a URL by removing the trailing slash,
 * unless the URL is just "/".
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed === '/' || trimmed === '') return trimmed || '/';
  return trimmed.replace(/\/+$/, '');
}

/**
 * Ensures a URL ends with a trailing slash.
 */
export function ensureTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : url + '/';
}

/**
 * Removes the trailing slash from a URL,
 * unless the URL is just "/".
 */
export function removeTrailingSlash(url: string): string {
  if (url === '/') return url;
  return url.replace(/\/+$/, '');
}
