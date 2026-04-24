import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import databaseConfig from '../config/databaseConfig';

const debug = Debug('app:database:EncryptionService');

/**
 * Service for encrypting/decrypting sensitive database fields at-rest.
 * Uses AES-256-GCM for authenticated encryption.
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private encryptionKey: Buffer | null = null;
  private readonly algorithm = 'aes-256-gcm';

  private constructor() {
    this.initializeKey();
  }

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  private initializeKey(): void {
    const configKey = databaseConfig.get('ENCRYPTION_KEY');

    if (configKey) {
      this.encryptionKey = crypto.createHash('sha256').update(configKey).digest();
      debug('Encryption key initialized from configuration');
    } else {
      const keyPath = path.join(process.cwd(), 'config', '.key');
      if (fs.existsSync(keyPath)) {
        this.encryptionKey = fs.readFileSync(keyPath);
        debug('Encryption key initialized from .key file');
      } else {
        console.warn(
          '[SECURITY] DATABASE_ENCRYPTION_KEY not configured — sensitive fields will be stored in plaintext. Set DATABASE_ENCRYPTION_KEY to enable at-rest encryption.'
        );
      }
    }
  }

  public isEnabled(): boolean {
    return this.encryptionKey !== null;
  }

  /**
   * Encrypts a string value.
   * Format: iv:authTag:encryptedData
   */
  public encrypt(text: string): string {
    if (!this.encryptionKey) return text;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts a value if it was previously encrypted.
   */
  public decrypt(text: string): string {
    if (!this.encryptionKey || !text.startsWith('enc:')) return text;

    const parts = text.split(':');
    if (parts.length !== 4) {
      throw new Error('Malformed encrypted value: expected 4 colon-delimited segments');
    }

    const [, ivHex, authTagHex, encryptedText] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

export const encryptionService = EncryptionService.getInstance();
