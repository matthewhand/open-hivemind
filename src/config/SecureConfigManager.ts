import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import Debug from 'debug';

const debug = Debug('app:SecureConfigManager');

export interface SecureConfig {
  id: string;
  name: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  encrypted: boolean;
}

export class SecureConfigManager {
  private static instance: SecureConfigManager;
  private configDir: string;
  private encryptionKey: string;

  private constructor() {
    // Create user config directory (gitignored)
    this.configDir = path.join(process.cwd(), 'config', 'user');
    this.ensureConfigDirectory();

    // Generate or load encryption key
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  public static getInstance(): SecureConfigManager {
    if (!SecureConfigManager.instance) {
      SecureConfigManager.instance = new SecureConfigManager();
    }
    return SecureConfigManager.instance;
  }

  private ensureConfigDirectory(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
      debug(`Created secure config directory: ${this.configDir}`);
    }
  }

  private getOrCreateEncryptionKey(): string {
    const keyFile = path.join(this.configDir, '.encryption_key');

    if (fs.existsSync(keyFile)) {
      return fs.readFileSync(keyFile, 'utf-8').trim();
    } else {
      // Generate a new encryption key
      const key = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(keyFile, key, { mode: 0o600 });
      debug('Generated new encryption key');
      return key;
    }
  }

  private encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedData: string): string {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  public saveConfig(name: string, data: Record<string, any>, encryptSensitive = true): SecureConfig {
    const id = crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();

    let processedData = { ...data };

    // Encrypt sensitive fields if requested
    if (encryptSensitive) {
      processedData = this.encryptSensitiveFields(data);
    }

    const config: SecureConfig = {
      id,
      name,
      data: processedData,
      createdAt: now,
      updatedAt: now,
      encrypted: encryptSensitive
    };

    const filePath = path.join(this.configDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), { mode: 0o600 });

    debug(`Saved secure config: ${name}`);
    return config;
  }

  public loadConfig(name: string): SecureConfig | null {
    const filePath = path.join(this.configDir, `${name}.json`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Decrypt sensitive fields if needed
      if (data.encrypted) {
        data.data = this.decryptSensitiveFields(data.data);
      }

      debug(`Loaded secure config: ${name}`);
      return data;
    } catch (error) {
      debug(`Failed to load config ${name}:`, error);
      return null;
    }
  }

  public listConfigs(): SecureConfig[] {
    const files = fs.readdirSync(this.configDir)
      .filter(file => file.endsWith('.json') && !file.startsWith('.'))
      .map(file => file.replace('.json', ''));

    return files.map(name => {
      const config = this.loadConfig(name);
      return config ? {
        ...config,
        data: {} // Don't include actual data in list
      } : null;
    }).filter(Boolean) as SecureConfig[];
  }

  public deleteConfig(name: string): boolean {
    const filePath = path.join(this.configDir, `${name}.json`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      debug(`Deleted secure config: ${name}`);
      return true;
    }

    return false;
  }

  public backupConfigs(): string {
    const backupDir = path.join(this.configDir, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    const allConfigs = this.listConfigs().map(config => this.loadConfig(config.name)).filter(Boolean);
    fs.writeFileSync(backupFile, JSON.stringify(allConfigs, null, 2));

    debug(`Created backup: ${backupFile}`);
    return backupFile;
  }

  public restoreFromBackup(backupFile: string): boolean {
    if (!fs.existsSync(backupFile)) {
      return false;
    }

    try {
      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

      for (const config of backupData) {
        this.saveConfig(config.name, config.data, config.encrypted);
      }

      debug(`Restored from backup: ${backupFile}`);
      return true;
    } catch (error) {
      debug(`Failed to restore backup:`, error);
      return false;
    }
  }

  private encryptSensitiveFields(data: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['token', 'key', 'secret', 'password', 'apiKey'];
    const result = { ...data };

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' &&
          sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        result[key] = this.encrypt(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.encryptSensitiveFields(value);
      }
    }

    return result;
  }

  private decryptSensitiveFields(data: Record<string, any>): Record<string, any> {
    const result = { ...data };

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.includes(':')) {
        try {
          result[key] = this.decrypt(value);
        } catch {
          // If decryption fails, keep original value
          result[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.decryptSensitiveFields(value);
      }
    }

    return result;
  }

  public getConfigDirectory(): string {
    return this.configDir;
  }
}