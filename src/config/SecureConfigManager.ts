import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Debug from 'debug';
import { ErrorUtils } from '../types/errors';

const debug = Debug('app:SecureConfigManager');

export interface SecureConfig {
  id: string;
  name: string;
  type?: string;
  data: any;
  updatedAt: string;
  checksum: string;
  createdAt?: string;
  rotationInterval?: number;
}

/**
 * SecureConfigManager handles the encryption and storage of sensitive configuration data.
 * It uses AES-256-GCM for authenticated encryption and stores data in the filesystem.
 */
export class SecureConfigManager {
  private static instance: SecureConfigManager;
  private readonly configDir: string;
  private readonly backupDir: string;
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyPath: string;
  private readonly mainConfigDir: string;

  private constructor() {
    this.configDir = path.join(process.cwd(), 'config', 'secure');
    this.backupDir = path.join(process.cwd(), 'config', 'backups');
    this.keyPath = path.join(process.cwd(), 'config', '.key');

    this.ensureDirectories();

    // Generate or load encryption key
    this.encryptionKey = this.getOrCreateEncryptionKey();
    this.mainConfigDir = path.join(process.cwd(), 'config');
  }

  public static getInstance(): SecureConfigManager {
    if (!SecureConfigManager.instance) {
      SecureConfigManager.instance = new SecureConfigManager();
    }
    return SecureConfigManager.instance;
  }

  /**
   * Helper to safely resolve a file path and prevent directory traversal
   */
  private getSecureFilePath(id: string): string {
    // Additional input validation: only allow alphanumeric, hyphens, and underscores
    // This prevents path traversal characters like ../ and ./ from even being processed
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw ErrorUtils.createError(
        'Invalid configuration ID: ID must contain only alphanumeric characters, hyphens, and underscores',
        'validation',
        'SECURE_CONFIG_INVALID_ID',
        400,
      );
    }

    const targetPath = path.join(this.configDir, `${id}.enc`);

    // Resolve both paths to their absolute forms
    const resolvedConfigDir = path.resolve(this.configDir);
    const resolvedTargetPath = path.resolve(targetPath);

    // Ensure the resolved target path starts with the resolved config directory
    if (!resolvedTargetPath.startsWith(resolvedConfigDir + path.sep) && resolvedTargetPath !== resolvedConfigDir) {
      throw ErrorUtils.createError(
        'Invalid configuration ID: Path traversal detected',
        'validation',
        'SECURE_CONFIG_INVALID_ID',
        400,
      );
    }

    return targetPath;
  }

  /**
   * Store a configuration securely
   */
  public async storeConfig(config: Omit<SecureConfig, 'updatedAt' | 'checksum'>): Promise<void> {
    // Validate configuration
    if (!config.id || config.id.trim() === '') {
      throw ErrorUtils.createError(
        'Configuration ID is required',
        'validation',
        'SECURE_CONFIG_ID_REQUIRED',
        400,
      );
    }
    if (!config.name || config.name.trim() === '') {
      throw ErrorUtils.createError(
        'Configuration name is required',
        'validation',
        'SECURE_CONFIG_NAME_REQUIRED',
        400,
      );
    }
    
    try {
      debug(`Storing configuration ${config.id}`);
      const secureConfig: SecureConfig = {
        ...config,
        updatedAt: new Date().toISOString(),
        checksum: '',
      };

      // Calculate checksum before encryption (exclude checksum field itself)
      const { checksum, ...configForChecksum } = secureConfig;
      secureConfig.checksum = this.calculateChecksum(configForChecksum);

      const filePath = this.getSecureFilePath(config.id);
      const encryptedData = this.encrypt(JSON.stringify(secureConfig));
      
      await fs.promises.writeFile(filePath, encryptedData, 'utf8');
      debug(`Configuration ${config.id} stored successfully`);
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error) as any;
      debug(`Failed to store configuration ${config.id}:`, hivemindError.message);
      throw ErrorUtils.createError(
        `Failed to store secure configuration: ${hivemindError.message}`,
        'unknown',
        'SECURE_CONFIG_STORE_FAILED',
        500,
      );
    }
  }

  /**
   * Retrieve a configuration securely
   */
  public async getConfig(id: string): Promise<SecureConfig | null> {
    try {
      const filePath = this.getSecureFilePath(id);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const encryptedData = await fs.promises.readFile(filePath, 'utf8');
      const decryptedData = this.decrypt(encryptedData);
      const config: SecureConfig = JSON.parse(decryptedData);

      // Verify integrity
      const { checksum, ...configWithoutChecksum } = config;
      if (this.calculateChecksum(configWithoutChecksum) !== checksum) {
        throw ErrorUtils.createError(
          'Configuration integrity check failed',
          'IntegrityError' as any,
          'SECURE_CONFIG_INTEGRITY_FAILED',
          500,
        );
      }

      // Check if rotation is required based on rotationInterval
      // Ensure the config actually contains keys before warning about rotation
      const hasConfiguredKeys = config.data && Object.keys(config.data).length > 0;
      if (hasConfiguredKeys && config.rotationInterval && config.rotationInterval > 0) {
        const lastUpdated = new Date(config.updatedAt).getTime();
        const now = Date.now();
        const daysSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60 * 24);

        if (daysSinceUpdate >= config.rotationInterval) {
          debug(`[WARNING] Secure configuration '${config.name}' (ID: ${config.id}) is due for credential rotation (Interval: ${config.rotationInterval} days, Days since update: ${Math.floor(daysSinceUpdate)} days).`);
          // In a fully automated system, this could trigger an event/webhook to automatically rotate secrets.
        }
      }

      return config;
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error) as any;
      debug(`Failed to retrieve configuration ${id}:`, hivemindError.message);
      return null;
    }
  }

  public getDecryptedMainConfig(env: string): any {
    try {
      const configPath = path.join(this.mainConfigDir, `${env}.json.enc`);
      if (fs.existsSync(configPath)) {
        const encryptedData = fs.readFileSync(configPath, 'utf8');
        const decryptedData = this.decrypt(encryptedData);
        return JSON.parse(decryptedData);
      }
      return null;
    } catch (error) {
      debug(`Failed to read decrypted main config for env ${env}:`, error);
      return null;
    }
  }

  /**
   * Delete a configuration
   */
  public async deleteConfig(id: string): Promise<void> {
    try {
      const filePath = this.getSecureFilePath(id);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        debug(`Configuration ${id} deleted`);
      }
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error) as any;
      debug(`Failed to delete configuration ${id}:`, hivemindError.message);
      throw ErrorUtils.createError(
        `Failed to delete secure configuration: ${hivemindError.message}`,
        'unknown',
        'SECURE_CONFIG_DELETE_FAILED',
        500,
      );
    }
  }

  /**
   * List all stored configurations (metadata only)
   */
  public async listConfigs(): Promise<Omit<SecureConfig, 'data'>[]> {
    try {
      const files = await fs.promises.readdir(this.configDir);
      const configPromises = files
        .filter(file => file.endsWith('.enc'))
        .map(async (file) => {
          const id = file.replace('.enc', '');
          const config = await this.getConfig(id);
          if (config) {
            const { data, ...metadata } = config;
            return metadata;
          }
          return null;
        });

      // Use allSettled so a single corrupt file doesn't abort the entire listing
      const results = await Promise.allSettled(configPromises);
      return results
        .filter((r): r is PromiseFulfilledResult<Omit<SecureConfig, 'data'>> =>
          r.status === 'fulfilled' && r.value !== null
        )
        .map(r => r.value);
    } catch (error: unknown) {
      debug('Failed to list configurations:', error);
      return [];
    }
  }

  /**
   * Create a full backup of all secure configurations
   */
  public async listBackups(): Promise<any[]> {
    try {
      if (!fs.existsSync(this.backupDir)) return [];
      const files = await fs.promises.readdir(this.backupDir);
      return files.filter(f => f.endsWith('.enc'));
    } catch {
      return [];
    }
  }

  public async createBackup(): Promise<string> {
    try {
      const configs = await fs.promises.readdir(this.configDir);
      const backupId = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
      const backupPath = path.join(this.backupDir, `${backupId}.json`);

      const configPromises = configs
        .filter(file => file.endsWith('.enc'))
        .map(async (file) => {
          const id = file.replace('.enc', '');
          const config = await this.getConfig(id);
          if (config) {
            return { id, config };
          }
          return null;
        });

      // Use allSettled so a single corrupt file doesn't abort the entire backup
      const results = await Promise.allSettled(configPromises);
      const allConfigs: Record<string, SecureConfig> = {};
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          allConfigs[result.value.id] = result.value.config;
        } else if (result.status === 'rejected') {
          debug('Skipping config during backup due to error:', result.reason);
        }
      }

      const fullBackupData = {
        metadata: {
          id: backupId,
          createdAt: new Date().toISOString(),
          configCount: Object.keys(allConfigs).length,
          checksum: '',
        },
        data: allConfigs,
      };

      // Calculate backup checksum on metadata
      const { checksum, ...metadataWithoutChecksum } = fullBackupData.metadata;
      fullBackupData.metadata.checksum = this.calculateChecksum(metadataWithoutChecksum);

      // Encrypt and store backup
      const encryptedBackup = this.encrypt(JSON.stringify(fullBackupData));
      await fs.promises.writeFile(backupPath, encryptedBackup, 'utf8');

      debug(`Backup ${backupId} created with ${Object.keys(allConfigs).length} configurations`);
      return backupId;
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error) as any;
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      debug('Failed to create backup:', {
        error: hivemindError.message,
        errorCode: hivemindError.code,
        errorType: errorInfo.type,
        severity: errorInfo.severity,
      });
      throw ErrorUtils.createError(
        `Backup creation failed: ${hivemindError.message}`,
        errorInfo.type,
        'SECURE_CONFIG_BACKUP_CREATE_FAILED',
        500,
      );
    }
  }

  /**
   * Restore from a backup
   */
  public async restoreBackup(backupId: string): Promise<void> {
    try {
      const backupPath = path.join(this.backupDir, `${backupId}.json`);

      // Security check to prevent path traversal
      const resolvedBackupPath = path.resolve(backupPath);
      const resolvedBackupDir = path.resolve(this.backupDir);
      if (!resolvedBackupPath.startsWith(resolvedBackupDir + path.sep) && resolvedBackupPath !== resolvedBackupDir) {
        throw ErrorUtils.createError(
          'Invalid backup ID: Path traversal detected',
          'validation',
          'SECURE_CONFIG_INVALID_BACKUP_ID',
          400,
        );
      }

      if (!fs.existsSync(backupPath)) {
        throw ErrorUtils.createError(
          `Backup ${backupId} not found`,
          'validation',
          'SECURE_CONFIG_BACKUP_NOT_FOUND',
          404,
        );
      }

      const encryptedBackup = await fs.promises.readFile(backupPath, 'utf8');
      const decryptedBackup = this.decrypt(encryptedBackup);
      const fullBackupData = JSON.parse(decryptedBackup);

      // Verify backup integrity
      const { checksum, ...metadataWithoutChecksum } = fullBackupData.metadata;
      if (this.calculateChecksum(metadataWithoutChecksum) !== checksum) {
        throw ErrorUtils.createError(
          'Backup integrity check failed',
          'IntegrityError' as any,
          'SECURE_CONFIG_BACKUP_INTEGRITY_FAILED',
          500,
        );
      }

      const { data } = fullBackupData;

      // Restore configurations
      await Promise.all(
        Object.values(data).map(config => this.storeConfig(config as SecureConfig))
      );

      debug(`Backup ${backupId} restored successfully`);
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error) as any;
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      debug(`Failed to restore backup ${backupId}:`, {
        error: hivemindError.message,
        errorCode: hivemindError.code,
        errorType: errorInfo.type,
        severity: errorInfo.severity,
      });
      throw ErrorUtils.createError(
        `Backup restoration failed: ${hivemindError.message}`,
        errorInfo.type,
        'SECURE_CONFIG_BACKUP_RESTORE_FAILED',
        500,
      );
    }
  }

  private ensureDirectories(): void {
    [this.configDir, this.backupDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private getOrCreateEncryptionKey(): Buffer {
    if (fs.existsSync(this.keyPath)) {
      return fs.readFileSync(this.keyPath);
    }
    
    const key = crypto.randomBytes(32);
    fs.writeFileSync(this.keyPath, key);
    return key;
  }

  public encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  public decrypt(text: string): string {
    const [ivHex, authTagHex, encryptedText] = text.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private calculateChecksum(data: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  private verifyChecksum(config: SecureConfig | any): boolean {
    const { checksum, ...data } = config;
    return this.calculateChecksum(data) === checksum;
  }
}
