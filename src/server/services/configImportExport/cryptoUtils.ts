/**
 * Encryption, decryption, compression, decompression, and checksum utilities
 * for configuration import/export.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { createGunzip, createGzip } from 'zlib';

const scryptAsync = promisify(scrypt);

/**
 * Encrypt data using AES-256-GCM with a password-derived key.
 */
export async function encryptData(data: string | Buffer, key: string): Promise<Buffer> {
  const algorithm = 'aes-256-gcm';
  const salt = randomBytes(16);
  const iv = randomBytes(16);

  // Derive key from password
  // ⚡ Bolt Optimization: Replaced synchronous scryptSync with async scrypt to prevent event loop blocking.
  const derivedKey = (await scryptAsync(key, salt, 32)) as Buffer;

  const cipher = createCipheriv(algorithm, derivedKey, iv);

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Combine salt, iv, auth tag, and encrypted data
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

/**
 * Decrypt data using AES-256-GCM with a password-derived key.
 */
export async function decryptData(encryptedData: Buffer, key: string): Promise<string> {
  const algorithm = 'aes-256-gcm';

  // Extract components
  const salt = encryptedData.subarray(0, 16);
  const iv = encryptedData.subarray(16, 32);
  const authTag = encryptedData.subarray(32, 48);
  const data = encryptedData.subarray(48);

  // Derive key from password
  // ⚡ Bolt Optimization: Replaced synchronous scryptSync with async scrypt to prevent event loop blocking.
  const derivedKey = (await scryptAsync(key, salt, 32)) as Buffer;

  const decipher = createDecipheriv(algorithm, derivedKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

  return decrypted.toString();
}

/**
 * Compress data using gzip.
 */
export async function compressData(data: string | Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const gzip = createGzip();

    gzip.on('data', (chunk) => chunks.push(chunk));
    gzip.on('end', () => resolve(Buffer.concat(chunks)));
    gzip.on('error', reject);

    gzip.end(data);
  });
}

/**
 * Decompress gzip data.
 */
export async function decompressData(compressedData: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const gunzip = createGunzip();

    gunzip.on('data', (chunk) => chunks.push(chunk));
    gunzip.on('end', () => resolve(Buffer.concat(chunks)));
    gunzip.on('error', reject);

    gunzip.end(compressedData);
  });
}

/**
 * Calculate SHA-256 checksum of data.
 */
export function calculateChecksum(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a unique export ID.
 */
export function generateExportId(): string {
  return 'export-' + Date.now().toString(36) + '-' + randomBytes(8).toString('hex');
}

/**
 * Generate a unique backup ID.
 */
export function generateBackupId(): string {
  return 'backup-' + Date.now().toString(36) + '-' + randomBytes(8).toString('hex');
}
