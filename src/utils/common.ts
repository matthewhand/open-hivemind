import crypto from 'crypto';

/**
 * Common utility functions
 */

// Helper to generate random integer between 0 and max using crypto
function getRandomInt(max: number): number {
  const randomBytes = crypto.randomBytes(4);
  return Math.floor((randomBytes.readUInt32BE() / 0x100000000) * (max + 1));
}

/**
 * Returns a specific emoji for known keywords or a random emoji.
 * @param keyword Optional keyword to get a specific emoji for.
 * @returns An emoji as a string.
 */
export function getEmoji(keyword?: string): string {
  if (keyword) {
    const lowerKeyword = keyword.toLowerCase();
    if (lowerKeyword === 'success') return '✅';
    if (lowerKeyword === 'error') return '❌';
    if (lowerKeyword === 'warning') return '⚠️';
    return '🤖';
  }

  const emojis = [
    '😀',
    '😂',
    '😅',
    '🤣',
    '😊',
    '😍',
    '🤔',
    '😎',
    '😢',
    '😡',
    '👍',
    '👎',
    '👌',
    '🙏',
    '💪',
    '🔥',
  ];
  return emojis[getRandomInt(emojis.length - 1)];
}

/**
 * Basic permission utilities
 */
export const permissions = {
  /**
   * Check if a user is allowed (placeholder implementation)
   */
  isUserAllowed: (): boolean => true,

  /**
   * Check if a role is allowed (placeholder implementation)
   */
  isRoleAllowed: (): boolean => true,
};

/**
 * Environment utilities
 */
export const environment = {
  /**
   * Get environment variable with fallback
   */
  get: (key: string, fallback = ''): string => {
    return process.env[key] || fallback;
  },

  /**
   * Check if running in development mode
   */
  isDevelopment: (): boolean => {
    return process.env.NODE_ENV === 'development';
  },

  /**
   * Check if running in production mode
   */
  isProduction: (): boolean => {
    return process.env.NODE_ENV === 'production';
  },
};

/**
 * String utilities
 */
export const strings = {
  /**
   * Capitalize first letter of a string
   */
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * Truncate string to specified length
   */
  truncate: (str: string, length: number): string => {
    return str.length > length ? str.substring(0, length) + '...' : str;
  },

  /**
   * Escape special regex characters
   */
  escapeRegExp: (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },
};

/**
 * Array utilities
 */
export const arrays = {
  /**
   * Get random element from array
   */
  random: <T>(arr: T[]): T | undefined => {
    if (arr.length === 0) return undefined;
    return arr[getRandomInt(arr.length - 1)];
  },

  /**
   * Remove duplicates from array
   */
  unique: <T>(arr: T[]): T[] => {
    return [...new Set(arr)];
  },
};

/**
 * Validation utilities
 */
export const validation = {
  /**
   * Check if string is empty or whitespace
   */
  isEmpty: (str: string): boolean => {
    return !str || str.trim().length === 0;
  },

  /**
   * Check if value is defined and not null
   */
  isDefined: <T>(value: T | null | undefined): value is T => {
    return value !== null && value !== undefined;
  },
};
