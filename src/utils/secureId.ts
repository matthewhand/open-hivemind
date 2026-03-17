import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure random ID.
 * Uses crypto.randomBytes for unpredictable identifiers.
 * 
 * @param length - Number of bytes to use (default 5 = 10 hex chars)
 * @returns A hex string of secure random bytes
 */
export function generateSecureId(length: number = 5): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate a secure ID with timestamp prefix for uniqueness.
 * Format: {timestamp}-{random}
 * 
 * @returns A unique ID combining timestamp and secure random bytes
 */
export function generateTimestampedId(): string {
  const timestamp = Date.now().toString(36);
  const random = generateSecureId(5);
  return `${timestamp}-${random}`;
}
