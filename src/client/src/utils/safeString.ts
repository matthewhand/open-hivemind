export const safeString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

export const safeArray = <T>(value: T[] | null | undefined): T[] =>
  Array.isArray(value) ? value : [];
