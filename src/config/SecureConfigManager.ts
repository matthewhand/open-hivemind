import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import Debug from 'debug';

const debug = Debug('app:SecureConfigManager');

export interface SecureConfig {
  id: string;
  name: string;
  type: 'bot' | 'user' | 'system';
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  checksum: string;
}

export interface BackupMetadata {
  id: string;
  timestamp: string;
  configs: string[];
  checksum: string;
  version: string;
}

/**
 * Secure Configuration Manager
 *
 * Provides encrypted storage for sensitive user configurations
 * Features:
 * - AES-256 encryption for data at rest
 * - Automatic backup and restore
 * - Data integrity verification
 * - Secure key management
 */
export class SecureConfigManager {
  private static instance: SecureConfigManager;
  private readonly configDir: string;
  private readonly backupDir: string;
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly mainConfigDir: string;

  constructor() {
    this.configDir = path.join(process.cwd(), 'config', 'user');
    this.backupDir = path.join(this.configDir, 'backups');

    // Ensure directories exist first
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
   * Store a configuration securely
   */
  public async storeConfig(config: Omit<SecureConfig, 'updatedAt' | 'checksum'>): Promise<void> {
    // Validate configuration
    if (!config.id || config.id.trim() === '') {
      throw new Error('Configuration ID is required');
    }
    if (!config.name || config.name.trim() === '') {
      throw new Error('Configuration name is required');
    }
    
    try {
      debug(`Storing configuration ${config.id}`);
      const secureConfig: SecureConfig = {
        ...config,
        updatedAt: new Date().toISOString(),
        checksum: ''
      };

      // Calculate checksum before encryption (exclude checksum field itself)
      const { checksum, ...configForChecksum } = secureConfig;
      secureConfig.checksum = this.calculateChecksum(configForChecksum);
      debug(`Checksum calculated: ${secureConfig.checksum}`);

      // Encrypt and store
      const encryptedData = this.encrypt(JSON.stringify(secureConfig));
      const filePath = path.join(this.configDir, `${config.id}.enc`);
      debug(`File path: ${filePath}`);

      await fs.promises.writeFile(filePath, encryptedData, 'utf8');
      debug(`Configuration ${config.id} stored securely`);

      // Verify file was created
      const fileExists = fs.existsSync(filePath);
      debug(`File exists after write: ${fileExists}`);
    } catch (error) {
      debug(`Failed to store configuration ${config.id}:`, error);
      throw new Error(`Failed to store configuration: ${error}`);
    }
  }

  /**
   * Retrieve a configuration securely
   */
  public async getConfig(id: string): Promise<SecureConfig | null> {
    try {
      const filePath = path.join(this.configDir, `${id}.enc`);

      if (!fs.existsSync(filePath)) {
        return null;
      }

      const encryptedData = await fs.promises.readFile(filePath, 'utf8');
      const decryptedData = this.decrypt(encryptedData);
      const config: SecureConfig = JSON.parse(decryptedData);

      // Verify integrity
      if (!this.verifyChecksum(config)) {
        throw new Error('Configuration integrity check failed');
      }

      return config;
    } catch (error) {
      debug(`Failed to retrieve configuration ${id}:`, error);
      return null;
    }
  }

  /**
   * List all stored configurations
   */
  public async listConfigs(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.configDir);
      return files
        .filter(file => file.endsWith('.enc'))
        .map(file => file.replace('.enc', ''));
    } catch (error) {
      debug('Failed to list configurations:', error);
      return [];
    }
  }

  /**
   * Delete a configuration
   */
  public async deleteConfig(id: string): Promise<boolean> {
    try {
      const filePath = path.join(this.configDir, `${id}.enc`);
      await fs.promises.unlink(filePath);
      debug(`Configuration ${id} deleted`);
      return true;
    } catch (error) {
      debug(`Failed to delete configuration ${id}:`, error);
      return false;
    }
  }

  /**
   * Create a backup of all configurations
   */
  public async createBackup(): Promise<string> {
    try {
      const configs = await this.listConfigs();
      const backupId = `backup_${Date.now()}`;
      const backupPath = path.join(this.backupDir, `${backupId}.json`);

      const backupData: BackupMetadata = {
        id: backupId,
        timestamp: new Date().toISOString(),
        configs: configs,
        checksum: '',
        version: '1.0'
      };

      // Collect all configuration data
      const configData: Record<string, SecureConfig> = {};
      for (const configId of configs) {
        const config = await this.getConfig(configId);
        if (config) {
          configData[configId] = config;
        }
      }

      // Create full backup structure
      const fullBackupData = { metadata: backupData, data: configData };

      // Calculate backup checksum on metadata
      const { checksum, ...metadataWithoutChecksum } = backupData;
      backupData.checksum = this.calculateChecksum(metadataWithoutChecksum);

      // Update full backup with checksum
      fullBackupData.metadata = backupData;

      // Encrypt and store backup
      const encryptedBackup = this.encrypt(JSON.stringify(fullBackupData));
      await fs.promises.writeFile(backupPath, encryptedBackup, 'utf8');

      debug(`Backup ${backupId} created with ${configs.length} configurations`);
      return backupId;
    } catch (error) {
      debug('Failed to create backup:', error);
      throw new Error(`Backup creation failed: ${error}`);
    }
  }

  /**
   * Restore from a backup
   */
  public async restoreBackup(backupId: string): Promise<void> {
    try {
      const backupPath = path.join(this.backupDir, `${backupId}.json`);

      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup ${backupId} not found`);
      }

      const encryptedBackup = await fs.promises.readFile(backupPath, 'utf8');
      const decryptedBackup = this.decrypt(encryptedBackup);
      const fullBackupData = JSON.parse(decryptedBackup);

      // Verify backup integrity
      if (!this.verifyChecksum(fullBackupData.metadata)) {
        throw new Error('Backup integrity check failed');
      }

      const { metadata, data } = fullBackupData;

      // Restore configurations
      for (const [configId, config] of Object.entries(data)) {
        await this.storeConfig(config as SecureConfig);
      }

      debug(`Backup ${backupId} restored successfully`);
    } catch (error) {
      debug(`Failed to restore backup ${backupId}:`, error);
      throw new Error(`Backup restoration failed: ${error}`);
    }
  }

  /**
   * List available backups
   */
  public async listBackups(): Promise<BackupMetadata[]> {
    try {
      const files = await fs.promises.readdir(this.backupDir);
      const backups: BackupMetadata[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.backupDir, file);
            const encryptedData = await fs.promises.readFile(filePath, 'utf8');
            const decryptedData = this.decrypt(encryptedData);
            const backupData = JSON.parse(decryptedData);

            if (this.verifyChecksum(backupData.metadata)) {
              backups.push(backupData.metadata);
            }
          } catch (error) {
            debug(`Failed to read backup ${file}:`, error);
          }
        }
      }

      return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      debug('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  public encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and encrypted data
    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted
    });
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  public decrypt(encryptedData: string): string {
    const { iv, authTag, data } = JSON.parse(encryptedData);

    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Get or create encryption key
   */
  private getOrCreateEncryptionKey(): Buffer {
    const keyPath = path.join(this.configDir, '.encryption_key');

    try {
      if (fs.existsSync(keyPath)) {
        return Buffer.from(fs.readFileSync(keyPath, 'utf8'), 'hex');
      }
    } catch (error) {
      debug('Failed to read existing encryption key:', error);
    }

    // Generate new key
    const key = crypto.randomBytes(32);
    fs.writeFileSync(keyPath, key.toString('hex'), { mode: 0o600 });
    debug('New encryption key generated and stored');
    return key;
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    [this.configDir, this.backupDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        debug(`Created directory: ${dir}`);
      }
    });
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: any): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data, Object.keys(data).sort()));
    return hash.digest('hex');
  }

  /**
   * Verify checksum for data integrity
   */
  private verifyChecksum(data: any): boolean {
    if (!data.checksum) return false;
    const { checksum, ...dataWithoutChecksum } = data;
    const calculatedChecksum = this.calculateChecksum(dataWithoutChecksum);
    return checksum === calculatedChecksum;
  }
  public getDecryptedMainConfig(env: string): any | null {
    const encPath = path.join(this.mainConfigDir, `${env}.json.enc`);
    if (fs.existsSync(encPath)) {
      const encrypted = fs.readFileSync(encPath, 'utf8');
      try {
        const decrypted = this.decrypt(encrypted);
        return JSON.parse(decrypted);
      } catch (error) {
        debug(`Failed to decrypt main config ${env}:`, error);
        return null;
      }
    }
    const jsonPath = path.join(this.mainConfigDir, `${env}.json`);
    if (fs.existsSync(jsonPath)) {
      try {
        return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      } catch (error) {
        debug(`Failed to parse main config ${env}:`, error);
        return null;
      }
    }
    return null;
  }
}