/**
 * Parser utilities for various data formats
 */

/**
 * Command parser utilities
 */
export const commandParser = {
  /**
   * Parse a command string into command and arguments
   */
  parse: (input: string): { command?: string; args: string[] } => {
    if (!input || typeof input !== 'string') {
      return { args: [] };
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return { args: [] };
    }

    // Check if it's a command (starts with ! or /)
    if (!trimmed.startsWith('!') && !trimmed.startsWith('/')) {
      return { args: [] };
    }

    const parts = trimmed.slice(1).split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    return { command, args };
  },
};

/**
 * Message parsing utilities
 */
export const messageParser = {
  /**
   * Extract mentions from message text
   */
  extractMentions: (text: string): string[] => {
    const mentionRegex = /<@([^>]+)>/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  },

  /**
   * Extract channel mentions from message text
   */
  extractChannelMentions: (text: string): string[] => {
    const channelRegex = /<#([^>]+)>/g;
    const mentions: string[] = [];
    let match;

    while ((match = channelRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  },

  /**
   * Remove formatting from message text
   */
  stripFormatting: (text: string): string => {
    return text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/<[^>]+>/g, '') // Remove Slack mentions
      .replace(/\*([^*]+)\*/g, '$1') // Remove bold
      .replace(/_([^_]+)_/g, '$1') // Remove italic
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .trim();
  },
};

/**
 * JSON parsing utilities with error handling
 */
export const jsonParser = {
  /**
   * Safely parse JSON with fallback
   */
  safeParse: <T = any>(jsonString: string, fallback: T): T => {
    try {
      return JSON.parse(jsonString);
    } catch {
      return fallback;
    }
  },

  /**
   * Safely stringify JSON with error handling
   */
  safeStringify: (obj: any, fallback: string = '{}'): string => {
    try {
      return JSON.stringify(obj);
    } catch {
      return fallback;
    }
  },
};

/**
 * Number parsing utilities
 */
export const numberParser = {
  /**
   * Parse number with fallback
   */
  parseNumber: (value: string | number, fallback: number = 0): number => {
    if (typeof value === 'number') {
      return isNaN(value) ? fallback : value;
    }

    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  },

  /**
   * Parse integer with fallback
   */
  parseInt: (value: string | number, fallback: number = 0): number => {
    if (typeof value === 'number') {
      if (isNaN(value)) return fallback;
      return Math.floor(value);
    }

    const parsed = global.parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
  },
};
