/**
 * Common utility functions
 */

/**
 * Returns a random emoji to be used in user prompts or as a filler.
 * @returns A random emoji as a string.
 */
export function getEmoji(): string {
  const emojis = ['😀', '😂', '😅', '🤣', '😊', '😍', '🤔', '😎', '😢', '😡', '👍', '👎', '👌', '🙏', '💪', '🔥'];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

/**
 * Basic permission utilities
 */
export const permissions = {
  /**
   * Check if a user is allowed (placeholder implementation)
   */
  isUserAllowed: () => true,

  /**
   * Check if a role is allowed (placeholder implementation)
   */
  isRoleAllowed: () => true
};

/**
 * Environment utilities
 */
export const environment = {
  /**
   * Get environment variable with fallback
   */
  get: (key: string, fallback: string = ''): string => {
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
  }
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
  }
};

/**
 * Array utilities
 */
export const arrays = {
  /**
   * Get random element from array
   */
  random: <T>(arr: T[]): T | undefined => {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  /**
   * Remove duplicates from array
   */
  unique: <T>(arr: T[]): T[] => {
    return [...new Set(arr)];
  }
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
  }
};