import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { promises as fs } from 'fs';
import { basename, join } from 'path';
import { createGunzip, createGzip } from 'zlib';
// @ts-ignore - csv-parse v6 ships its own types but TS can't resolve the /sync subpath
// @ts-ignore - csv-stringify v6 ships its own types but TS can't resolve the /sync subpath
import Debug from 'debug';
import { AuditLogger } from '../../common/auditLogger';
import { SecureConfigManager } from '../../config/SecureConfigManager';
import { UserConfigStore } from '../../config/UserConfigStore';
import { DatabaseManager } from '../../database/DatabaseManager';
import { ConfigurationTemplateService } from './ConfigurationTemplateService';
import { ConfigurationValidator } from './ConfigurationValidator';
import { ConfigurationVersionService } from './ConfigurationVersionService';

const debug = Debug('app:ConfigurationImportExportService');

export interface ExportOptions {
  format: 'json' | 'yaml' | 'csv';
  includeVersions?: boolean;
  includeAuditLogs?: boolean;
  includeTemplates?: boolean;
  compress?: boolean;
  encrypt?: boolean;
  encryptionKey?: string;
}

export interface ImportOptions {
  format: 'json' | 'yaml' | 'csv';
  overwrite?: boolean;
  validateOnly?: boolean;
  skipValidation?: boolean;
  decryptionKey?: string;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  size?: number;
  checksum?: string;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  importedCount?: number;
  skippedCount?: number;
  errorCount?: number;
  errors?: string[];
  warnings?: string[];
}

export interface BackupMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  configCount: number;
  versionCount: number;
  templateCount: number;
  size: number;
  checksum: string;
  encrypted: boolean;
  compressed: boolean;
}

export class ConfigurationImportExportService {
  private static instance: ConfigurationImportExportService;
  private dbManager: DatabaseManager;
  private configValidator: ConfigurationValidator;
  private templateService: ConfigurationTemplateService;
  private versionService: ConfigurationVersionService;
  private exportsDir: string;
  private backupsDir: string;

  private constructor() {
    this.dbManager = DatabaseManager.getInstance();
    this.configValidator = new ConfigurationValidator();
    this.templateService = ConfigurationTemplateService.getInstance();
    this.versionService = ConfigurationVersionService.getInstance();
    this.exportsDir = join(process.cwd(), 'config', 'exports');
    this.backupsDir = join(process.cwd(), 'config', 'backups');
    this.ensureDirectories();
  }

  public static getInstance(): ConfigurationImportExportService {
    if (!ConfigurationImportExportService.instance) {
      ConfigurationImportExportService.instance = new ConfigurationImportExportService();
    }
    return ConfigurationImportExportService.instance;
  }

  /**
   * Ensure export and backup directories exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.exportsDir, { recursive: true });
      await fs.mkdir(this.backupsDir, { recursive: true });
      debug('Export and backup directories ensured');
    } catch (error) {
      debug('Error creating directories:', error);
    }
  }

  /**
   * Export configurations to file
   */
  async exportConfigurations(
    configIds: number[],
    options: ExportOptions,
    fileName?: string,
    createdBy?: string
  ): Promise<ExportResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseFileName = fileName || `configurations-export-${timestamp}`;
      let filePath = join(this.exportsDir, `${baseFileName}.${options.format}`);

      // Get configurations
      const configs = [];
      for (const id of configIds) {
        const config = await this.dbManager.getBotConfiguration(id);
        if (config) {
          configs.push(config);
        }
      }

      if (configs.length === 0) {
        return {
          success: false,
          error: 'No configurations found to export',
        };
      }

      // Prepare export data
      const exportData: any = {
        metadata: {
          id: this.generateExportId(),
          name: baseFileName,
          createdAt: new Date(),
          createdBy,
          configCount: configs.length,
          format: options.format,
          encrypted: !!options.encrypt,
          compressed: !!options.compress,
        },
        configurations: configs,
      };

      // Include versions if requested
      if (options.includeVersions) {
        const versionPromises = configs
          .filter((c) => c.id != null)
          .map(async (config) => this.dbManager.getBotConfigurationVersions(config.id as number));
        const versionsNested = await Promise.allSettled(versionPromises);
        const versions = versionsNested
          .map((r) => (r.status === 'fulfilled' ? r.value : []))
          .flat();

        exportData.versions = versions;
        exportData.metadata.versionCount = versions.length;
      }

      // Include templates if requested
      if (options.includeTemplates) {
        const templates = await this.templateService.getAllTemplates();
        exportData.templates = templates;
        exportData.metadata.templateCount = templates.length;
      }

      // Include audit logs if requested
      if (options.includeAuditLogs) {
        const auditLogs: any[] = [];
        const configIdsToFetch = configs.map((c) => c.id).filter(Boolean) as number[];
        if (configIdsToFetch.length > 0) {
          const auditLogsMap = await this.dbManager.getBotConfigurationAuditBulk(configIdsToFetch);
          for (const config of configs) {
            if (config.id) {
              const logs = auditLogsMap.get(config.id) || [];
              auditLogs.push(...logs);
            }
          }
        }
        exportData.auditLogs = auditLogs;
      }

      // Convert to requested format
      let data: string | Buffer;
      switch (options.format) {
        case 'json':
          data = JSON.stringify(exportData, null, 2);
          break;
        case 'yaml':
          // Simple YAML conversion (in production, use a proper YAML library)
          data = this.convertToYAML(exportData);
          break;
        case 'csv':
          data = this.convertToCSV(exportData);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      // Encrypt if requested
      if (options.encrypt) {
        if (!options.encryptionKey) {
          throw new Error('Encryption key is required for encrypted export');
        }
        data = await this.encryptData(data, options.encryptionKey);
        filePath += '.enc';
      }

      // Compress if requested
      if (options.compress) {
        data = await this.compressData(data);
        filePath += '.gz';
      }

      // Write to file
      await fs.writeFile(filePath, data);

      // Calculate checksum
      const checksum = this.calculateChecksum(data);

      debug(`Exported ${configs.length} configurations to ${filePath}`);

      return {
        success: true,
        filePath,
        size: data.length,
        checksum,
      };
    } catch (error) {
      debug('Error exporting configurations:', error);
      return {
        success: false,
        error: (error as any).message,
      };
    }
  }

  /**
   * Export main configuration file (default.json, development.json, etc.)
   */
  async exportMainConfig(
    env: string,
    options: ExportOptions,
    fileName?: string,
    createdBy?: string
  ): Promise<ExportResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseFileName = fileName || `${env}-config-${timestamp}`;
      let filePath = join(this.exportsDir, `${baseFileName}.${options.format}`);

      // Get main configuration from SecureConfigManager
      const secureManager = SecureConfigManager.getInstance();
      const config = secureManager.getDecryptedMainConfig(env);

      if (!config) {
        return {
          success: false,
          error: `Main configuration for environment ${env} not found`,
        };
      }

      // Prepare export data
      const exportData: any = {
        metadata: {
          id: this.generateExportId(),
          name: baseFileName,
          createdAt: new Date(),
          createdBy,
          format: options.format,
          encrypted: !!options.encrypt,
          compressed: !!options.compress,
          env,
        },
        config,
      };

      // Convert to requested format
      let data: string | Buffer;
      switch (options.format) {
        case 'json':
          data = JSON.stringify(exportData, null, 2);
          break;
        case 'yaml':
          data = this.convertToYAML(exportData);
          break;
        case 'csv':
          data = this.convertToCSV(exportData);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      // Encrypt if requested
      if (options.encrypt) {
        if (!options.encryptionKey) {
          throw new Error('Encryption key is required for encrypted export');
        }
        data = await this.encryptData(data, options.encryptionKey);
        filePath += '.enc';
      }

      // Compress if requested
      if (options.compress) {
        data = await this.compressData(data);
        filePath += '.gz';
      }

      // Write to file
      await fs.writeFile(filePath, data);

      // Calculate checksum
      const checksum = this.calculateChecksum(data);

      debug(`Exported main configuration for ${env} to ${filePath}`);

      return {
        success: true,
        filePath,
        size: Buffer.byteLength(data),
        checksum,
      };
    } catch (error) {
      debug('Error exporting main configuration:', error);
      return {
        success: false,
        error: (error as any).message,
      };
    }
  }

  /**
   * Import main configuration file (default.json, development.json, etc.)
   */
  async importMainConfig(
    filePath: string,
    options: ImportOptions,
    importedBy?: string
  ): Promise<ImportResult> {
    try {
      // Read file
      let data: Buffer | string = await fs.readFile(filePath);

      // Determine environment from filename
      const fileName = basename(filePath);
      const envMatch = fileName.match(/(default|development|production|test)/);
      const env = envMatch ? envMatch[1] : 'default';

      // Decompress if needed
      if (filePath.endsWith('.gz')) {
        data = await this.decompressData(data);
      }

      // Decrypt if needed
      if (filePath.endsWith('.enc')) {
        const strData = data.toString('utf8');
        try {
          const parsedEncrypted = JSON.parse(strData);
          if (parsedEncrypted.iv && parsedEncrypted.authTag && parsedEncrypted.data) {
            // Handle SecureConfigManager encrypted format
            const secureManager = SecureConfigManager.getInstance();
            const decryptedStr = secureManager.decrypt(strData);
            const importData = JSON.parse(decryptedStr);

            // Extract the config and save it using SecureConfigManager
            const configToSave = importData.config || importData;
            const encryptedConfig = secureManager.encrypt(JSON.stringify(configToSave));
            const configPath = join(secureManager['mainConfigDir'], `${env}.json.enc`);
            await fs.writeFile(configPath, encryptedConfig);

            return {
              success: true,
              importedCount: 1,
              warnings: [`Main configuration for ${env} imported and encrypted`],
            };
          }
        } catch (parseError) {
          // Not Secure format, fall back to own decryption
        }

        if (!options.decryptionKey) {
          throw new Error('Decryption key is required for encrypted import');
        }
        data = await this.decryptData(data, options.decryptionKey as string);
      }

      // Parse data based on format
      let importData: any;
      const format = this.detectFormat(filePath);

      switch (format) {
        case 'json':
          importData = JSON.parse(data.toString());
          break;
        case 'yaml':
          importData = this.parseYAML(data.toString());
          break;
        case 'csv':
          importData = this.parseCSV(data.toString());
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }

      // Validate import data structure
      const configToSave = importData.config || importData;

      // Save using SecureConfigManager
      const secureManager = SecureConfigManager.getInstance();
      const encryptedConfig = secureManager.encrypt(JSON.stringify(configToSave));
      const configPath = join(secureManager['mainConfigDir'], `${env}.json.enc`);
      await fs.writeFile(configPath, encryptedConfig);

      debug(`Imported main configuration for ${env} from ${filePath}`);

      return {
        success: true,
        importedCount: 1,
        warnings: [`Main configuration for ${env} imported and encrypted`],
      };
    } catch (error) {
      debug('Error importing main configuration:', error);
      return {
        success: false,
        errors: [(error as any).message],
      };
    }
  }

  /**
   * Import configurations from file
   *
   * Note on Caching: When importing configurations, if the import data contains multiple
   * versions referencing the same `botConfigurationId`, this method caches the DB validation
   * results for those IDs (both valid and invalid). This cache is request-scoped and ephemeral,
   * living only for the duration of the method call to prevent N+1 query patterns. Large imports
   * with many unique config IDs will correctly make exactly one DB call per unique ID.
   */
  async importConfigurations(
    filePath: string,
    options: ImportOptions,
    importedBy?: string
  ): Promise<ImportResult> {
    try {
      // Read file
      let data: Buffer | string = await fs.readFile(filePath);

      // Decompress if needed
      if (filePath.endsWith('.gz')) {
        data = await this.decompressData(data);
      }

      // Decrypt if needed
      if (filePath.endsWith('.enc')) {
        if (!options.decryptionKey) {
          throw new Error('Decryption key is required for encrypted import');
        }
        data = await this.decryptData(data, options.decryptionKey as string);
      }

      // Parse data based on format
      let importData: any;
      const format = this.detectFormat(filePath);

      switch (format) {
        case 'json':
          importData = JSON.parse(data.toString());
          break;
        case 'yaml':
          importData = this.parseYAML(data.toString());
          break;
        case 'csv':
          importData = this.parseCSV(data.toString());
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }

      // Validate import data structure
      if (!importData.configurations || !Array.isArray(importData.configurations)) {
        throw new Error('Invalid import data: configurations array is required');
      }

      const result: ImportResult = {
        success: true,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
        warnings: [],
      };

      // Process configurations
      for (const config of importData.configurations) {
        try {
          // Validate configuration
          if (!options.skipValidation) {
            const validationResult = this.configValidator.validateBotConfig(config);
            if (!validationResult.isValid) {
              if (options.validateOnly) {
                result.errors?.push(
                  `Configuration validation failed: ${validationResult.errors.join(', ')}`
                );
                result.errorCount = (result.errorCount || 0) + 1;
                continue;
              } else {
                result.warnings?.push(
                  `Configuration validation warnings: ${validationResult.errors.join(', ')}`
                );
              }
            }
          }

          if (options.validateOnly) {
            continue;
          }

          // Check if configuration exists
          const existingConfig = config.id
            ? await this.dbManager.getBotConfiguration(config.id)
            : null;

          if (existingConfig && !options.overwrite) {
            result.skippedCount = (result.skippedCount || 0) + 1;
            result.warnings?.push(`Configuration ${config.name} already exists, skipping`);
            continue;
          }

          // Create or update configuration
          if (existingConfig && options.overwrite) {
            if (existingConfig.id) {
              await this.dbManager.updateBotConfiguration(existingConfig.id, config);
            }
            result.warnings?.push(`Configuration ${config.name} updated`);
          } else {
            await this.dbManager.createBotConfiguration(config);
          }

          result.importedCount = (result.importedCount || 0) + 1;
        } catch (error) {
          result.errors?.push(
            `Error processing configuration ${config.name || 'unknown'}: ${(error as any).message}`
          );
          result.errorCount = (result.errorCount || 0) + 1;
        }
      }

      // Process versions if included
      if (importData.versions && !options.validateOnly) {
        // Cache to avoid N+1 queries when importing multiple versions for the same configuration
        const validConfigIds = new Set<number>();
        const invalidConfigIds = new Set<number>();

        for (const version of importData.versions) {
          try {
            const configId = version.botConfigurationId;
            let isValid = validConfigIds.has(configId);

            if (!isValid && !invalidConfigIds.has(configId)) {
              // Check if configuration exists
              const config = await this.dbManager.getBotConfiguration(configId);
              if (config) {
                validConfigIds.add(configId);
                isValid = true;
              } else {
                invalidConfigIds.add(configId);
              }
            }

            if (isValid) {
              await this.dbManager.createBotConfigurationVersion(version);
            }
          } catch (error) {
            result.warnings?.push(`Error processing version: ${(error as any).message}`);
          }
        }
      }

      // Process templates if included
      if (importData.templates && !options.validateOnly) {
        const BATCH_SIZE = 50;

        // Fetch all existing template IDs once
        let allExistingTemplateIds: Set<string>;
        try {
          allExistingTemplateIds = await this.templateService.getAllTemplateIds();
        } catch (error) {
          result.warnings?.push(`Error fetching existing templates: ${(error as any).message}`);
          allExistingTemplateIds = new Set();
        }

        const newlyCreatedTemplateIds = new Set<string>();

        for (let i = 0; i < importData.templates.length; i += BATCH_SIZE) {
          const batch = importData.templates.slice(i, i + BATCH_SIZE);

          // Create new templates concurrently within the batch
          await Promise.all(
            batch
              .filter(
                (template: any) =>
                  !allExistingTemplateIds.has(template.id) &&
                  !newlyCreatedTemplateIds.has(template.id)
              )
              .map(async (template: any) => {
                try {
                  await this.templateService.createTemplate({
                    name: template.name,
                    description: template.description,
                    category: template.category,
                    tags: template.tags,
                    config: template.config,
                    createdBy: importedBy,
                  });
                  newlyCreatedTemplateIds.add(template.id);
                } catch (error) {
                  result.warnings?.push(`Error processing template: ${(error as any).message}`);
                }
              })
          );
        }
      }

      debug(`Imported ${result.importedCount} configurations from ${filePath}`);
      return result;
    } catch (error) {
      debug('Error importing configurations:', error);
      return {
        success: false,
        errors: [(error as any).message],
      };
    }
  }

  /**
   * Create a backup of all configurations.
   *
   * Side-effects:
   * - Enforces a configurable backup retention policy (deletes or cold-stores old backups if count > max).
   * - Emits an audit log event when an old backup is pruned.
   *
   * @param name The name of the backup
   * @param description Optional description for the backup
   * @param createdBy User who triggered the backup
   * @param options Additional export options (format, encryption, etc.)
   * @returns An ExportResult containing the filePath, size, and checksum on success.
   */
  async createBackup(
    name: string,
    description?: string,
    createdBy?: string,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      // Get all configuration IDs
      const configs = await this.dbManager.getAllBotConfigurations();
      const configIds = configs.map((config) => config.id).filter(Boolean) as number[];

      const exportOptions: ExportOptions = {
        format: 'json',
        includeVersions: true,
        includeAuditLogs: true,
        includeTemplates: true,
        compress: true,
        encrypt: false,
        ...options,
      };

      const result = await this.exportConfigurations(
        configIds,
        exportOptions,
        `backup-${name}`,
        createdBy
      );

      if (result.success && result.filePath) {
        // Move to backups directory
        const backupTimestamp = Date.now();
        const backupFileName = `backup-${name}-${backupTimestamp}.json.gz`;
        const backupPath = join(this.backupsDir, backupFileName);
        await fs.rename(result.filePath, backupPath);

        // Create metadata file
        const metadata: BackupMetadata = {
          id: this.generateBackupId(),
          name,
          description,
          createdAt: new Date(backupTimestamp),
          createdBy: createdBy || 'unknown',
          configCount: configIds.length,
          versionCount: 0, // Will be calculated
          templateCount: 0, // Will be calculated
          size: result.size || 0,
          checksum: result.checksum || '',
          encrypted: !!exportOptions.encrypt,
          compressed: !!exportOptions.compress,
        };

        const metadataPath = join(this.backupsDir, `${backupFileName}.meta`);
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

        // Enforce backup retention policy with configurable limits and cold storage
        try {
          const generalSettings = UserConfigStore.getInstance().getGeneralSettings();
          const maxBackups =
            typeof generalSettings.backupRetentionLimit === 'number'
              ? generalSettings.backupRetentionLimit
              : 10;
          const enableColdStorage = generalSettings.enableColdStorage === true;

          const allBackups = await this.listBackups();
          if (allBackups.length > maxBackups) {
            debug(`Enforcing backup retention policy: keeping latest ${maxBackups} backups`);

            const auditLogger = AuditLogger.getInstance();

            // listBackups sorts from newest to oldest
            const backupsToDelete = allBackups.slice(maxBackups);
            for (const oldBackup of backupsToDelete) {
              if (enableColdStorage) {
                debug(`Archiving old backup to cold storage: ${oldBackup.id} (${oldBackup.name})`);
                const oldBackupFileName = `backup-${oldBackup.name}-${new Date(oldBackup.createdAt).getTime()}.json.gz`;
                const oldBackupPath = join(this.backupsDir, oldBackupFileName);
                const coldDir = join(process.cwd(), 'config', 'backups', 'cold');
                await fs.mkdir(coldDir, { recursive: true });

                try {
                  await fs.rename(oldBackupPath, join(coldDir, oldBackupFileName));
                  // delete metadata to drop from active list
                  await fs.unlink(join(this.backupsDir, `${oldBackupFileName}.meta`));

                  auditLogger.logAdminAction(
                    createdBy || 'system',
                    'ARCHIVE',
                    `backup/${oldBackup.id}`,
                    'success',
                    `Archived backup ${oldBackup.name} to cold storage due to retention limit`
                  );
                } catch (e) {
                  debug(`Failed to cold store backup ${oldBackup.id}, falling back to delete:`, e);
                  await this.deleteBackup(oldBackup.id);
                  auditLogger.logAdminAction(
                    createdBy || 'system',
                    'DELETE',
                    `backup/${oldBackup.id}`,
                    'success',
                    `Deleted backup ${oldBackup.name} due to retention limit (cold storage failed)`
                  );
                }
              } else {
                debug(`Deleting old backup: ${oldBackup.id} (${oldBackup.name})`);
                await this.deleteBackup(oldBackup.id);
                auditLogger.logAdminAction(
                  createdBy || 'system',
                  'DELETE',
                  `backup/${oldBackup.id}`,
                  'success',
                  `Deleted backup ${oldBackup.name} due to retention limit`
                );
              }
            }
          }
        } catch (retentionError) {
          debug('Error enforcing backup retention:', retentionError);
        }

        return {
          ...result,
          filePath: backupPath,
        };
      }

      return result;
    } catch (error) {
      debug('Error creating backup:', error);
      return {
        success: false,
        error: (error as any).message,
      };
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(
    backupPath: string,
    options: Partial<ImportOptions> = {},
    restoredBy?: string
  ): Promise<ImportResult> {
    try {
      const importOptions: ImportOptions = {
        format: 'json',
        overwrite: true,
        validateOnly: false,
        skipValidation: false,
        ...options,
      };

      return this.importConfigurations(backupPath, importOptions, restoredBy);
    } catch (error) {
      debug('Error restoring from backup:', error);
      return {
        success: false,
        errors: [(error as any).message],
      };
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const files = await fs.readdir(this.backupsDir);
      const backups: BackupMetadata[] = [];

      for (const file of files) {
        if (file.endsWith('.meta')) {
          try {
            const metadataPath = join(this.backupsDir, file);
            const data = await fs.readFile(metadataPath, 'utf-8');
            const metadata = JSON.parse(data);

            // Convert date strings back to Date objects
            metadata.createdAt = new Date(metadata.createdAt);

            backups.push(metadata);
          } catch (error) {
            debug('Error reading backup metadata:', file, error);
          }
        }
      }

      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      debug('Error listing backups:', error);
      return [];
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const backups = await this.listBackups();
      const backup = backups.find((b) => b.id === backupId);

      if (!backup) {
        return false;
      }

      const backupFileName = `backup-${backup.name}-${backup.createdAt.getTime()}.json.gz`;
      const backupPath = join(this.backupsDir, backupFileName);
      const metadataPath = join(this.backupsDir, `${backupFileName}.meta`);

      await fs.unlink(backupPath);
      await fs.unlink(metadataPath);

      debug('Deleted backup:', backup.name);
      return true;
    } catch (error) {
      debug('Error deleting backup:', error);
      return false;
    }
  }

  /**
   * Generate export ID
   */
  private generateExportId(): string {
    return 'export-' + Date.now().toString(36) + '-' + randomBytes(8).toString('hex');
  }

  /**
   * Generate backup ID
   */
  private generateBackupId(): string {
    return 'backup-' + Date.now().toString(36) + '-' + randomBytes(8).toString('hex');
  }

  /**
   * Detect file format from extension
   */
  private detectFormat(filePath: string): 'json' | 'yaml' | 'csv' {
    const ext = filePath.toLowerCase().split('.').pop();
    switch (ext) {
      case 'json':
        return 'json';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'csv':
        return 'csv';
      default:
        return 'json'; // Default to JSON
    }
  }

  /**
   * Convert data to YAML (simplified implementation)
   */
  private convertToYAML(data: any): string {
    // This is a simplified YAML converter
    // In production, use a proper YAML library like js-yaml
    const convert = (obj: any, indent = 0): string => {
      const spaces = ' '.repeat(indent);
      let result = '';

      if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
          for (const item of obj) {
            result += spaces + '- ' + convert(item, indent + 2).trim() + '\n';
          }
        } else {
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null) {
              result += spaces + key + ':\n' + convert(value, indent + 2);
            } else {
              result += spaces + key + ': ' + value + '\n';
            }
          }
        }
      } else {
        return String(obj);
      }

      return result;
    };

    return convert(data);
  }

  /**
   * Convert data to CSV (simplified implementation)
   */
  private convertToCSV(data: any): string {
    // This is a simplified CSV converter for configurations
    // In production, use a proper CSV library
    if (!data.configurations || !Array.isArray(data.configurations)) {
      throw new Error('Cannot convert non-configuration data to CSV');
    }

    const configs = data.configurations;
    if (configs.length === 0) {
      return '';
    }

    // Get headers from first configuration
    const headers = Object.keys(configs[0]);
    let csv = headers.join(',') + '\n';

    // Add data rows
    for (const config of configs) {
      const row = headers.map((header) => {
        const value = config[header];
        // Escape quotes and wrap in quotes if contains comma or quote
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csv += row.join(',') + '\n';
    }

    return csv;
  }

  /**
   * Parse YAML (simplified implementation)
   */
  private parseYAML(yamlString: string): any {
    // This is a simplified YAML parser
    // In production, use a proper YAML library like js-yaml
    throw new Error('YAML parsing not implemented in this version');
  }

  /**
   * Parse CSV (simplified implementation)
   */
  private parseCSV(csvString: string): any {
    // This is a simplified CSV parser
    // In production, use a proper CSV library
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('Invalid CSV format');
    }

    const headers = lines[0].split(',');
    const configurations = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const config: any = {};

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j].trim();
        let value = values[j] || '';

        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1).replace(/""/g, '"');
        }

        config[header] = value;
      }

      configurations.push(config);
    }

    return { configurations };
  }

  /**
   * Encrypt data
   */
  private async encryptData(data: string | Buffer, key: string): Promise<Buffer> {
    const algorithm = 'aes-256-gcm';
    const salt = randomBytes(16);
    const iv = randomBytes(16);

    // Derive key from password
    const derivedKey = scryptSync(key, salt, 32);

    const cipher = createCipheriv(algorithm, derivedKey, iv);

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Combine salt, iv, auth tag, and encrypted data
    return Buffer.concat([salt, iv, authTag, encrypted]);
  }

  /**
   * Decrypt data
   */
  private async decryptData(encryptedData: Buffer, key: string): Promise<string> {
    const algorithm = 'aes-256-gcm';

    // Extract components
    const salt = encryptedData.subarray(0, 16);
    const iv = encryptedData.subarray(16, 32);
    const authTag = encryptedData.subarray(32, 48);
    const data = encryptedData.subarray(48);

    // Derive key from password
    const derivedKey = scryptSync(key, salt, 32);

    const decipher = createDecipheriv(algorithm, derivedKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

    return decrypted.toString();
  }

  /**
   * Compress data
   */
  private async compressData(data: string | Buffer): Promise<Buffer> {
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
   * Decompress data
   */
  private async decompressData(compressedData: Buffer): Promise<Buffer> {
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
   * Calculate checksum
   */
  private calculateChecksum(data: string | Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
