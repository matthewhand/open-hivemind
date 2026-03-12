/**
 * Safely converts a value to a renderable string.
 * Prevents "Objects are not valid as a React child" crashes.
 */
export function safeString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}
