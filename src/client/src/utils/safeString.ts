/**
 * Safely converts a value to a renderable string.
 * Prevents "Objects are not valid as a React child" crashes.
 */
export function safeString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || value === 'boolean') return String(value);
  return fallback;
}

/**
 * Safely converts a value to a number.
 * Returns fallback for null, undefined, NaN, or non-numeric values.
 */
export function safeNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

/**
 * Safely ensures a value is an array.
 * Prevents .map()/.filter() crashes on null/undefined props.
 */
export function safeArray<T>(value: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(value)) return value as T[];
  return fallback;
}
