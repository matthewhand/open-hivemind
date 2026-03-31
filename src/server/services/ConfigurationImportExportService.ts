import { promises as fs } from 'fs';
import * as path from 'path';
import Debug from 'debug';
import { SecureConfigManager } from '../../config/SecureConfigManager';
import { DatabaseManager } from '../../database/DatabaseManager';
import { ErrorUtils } from '../../types/errors';
import { ConfigurationTemplateService } from './ConfigurationTemplateService';
import { ConfigurationValidator } from './ConfigurationValidator';
import { ConfigurationVersionService } from './ConfigurationVersionService';
import {
  BackupManager,
  calculateChecksum,
  compressData,
  convertToCSV,
  convertToYAML,
  decompressData,
  decryptData,
  detectFormat,
  encryptData,
  generateExportId,
  parseCSV,
  parseYAML,
} from './configImportExport';

import type {
  BackupMetadata,
  ExportOptions,
  ExportResult,
  ImportOptions,
  ImportResult,
} from './configImportExport';

// Re-export types so existing imports from this file continue to work
export type { ExportOptions, ImportOptions, ExportResult, ImportResult, BackupMetadata };

const debug = Debug('app:ConfigurationImportExportService');

export class ConfigurationImportExportService {
  private static instance: ConfigurationImportExportService;
  private dbManager: DatabaseManager;
  private configValidator: ConfigurationValidator;
  private templateService: ConfigurationTemplateService;
  private versionService: ConfigurationVersionService;
  private exportsDir: string;
  private backupsDir: string;
  private backupManager: BackupManager;

  private constructor() {
    this.dbManager = DatabaseManager.getInstance();
    this.configValidator = new ConfigurationValidator();
    this.templateService = ConfigurationTemplateService.getInstance();
    this.versionService = ConfigurationVersionService.getInstance();
    this.exportsDir = path.join(process.cwd(), 'config', 'exports');
    this.backupsDir = path.join(process.cwd(), 'config', 'backups');
    this.ensureDirectories();

    this.backupManager = new BackupManager(this.backupsDir, {
      getAllBotConfigurations: () => this.dbManager.getAllBotConfigurations(),
      exportConfigurations: (configIds, options, fileName, createdBy) =>
        this.exportConfigurations(configIds, options, fileName, createdBy),
      importConfigurations: (filePath, options, importedBy) =>
        this.importConfigurations(filePath, options, importedBy),
    });
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
      let filePath = path.join(this.exportsDir, `${baseFileName}.${options.format}`);

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
      const exportData: Record<string, unknown> = {
        metadata: {
          id: generateExportId(),
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
      let data: string | Buffer = this.convertFormat(exportData, options.format);

      // Encrypt if requested
      if (options.encrypt) {
        if (!options.encryptionKey) {
          throw new Error('Encryption key is required for encrypted export');
        }
        data = await encryptData(data, options.encryptionKey);
        filePath += '.enc';
      }

      // Compress if requested
      if (options.compress) {
        data = await compressData(data);
        filePath += '.gz';
      }

      // Write to file
      await fs.writeFile(filePath, data);

      // Calculate checksum
      const checksum = calculateChecksum(data);

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
        error: ErrorUtils.getMessage(error),
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
      let filePath = path.join(this.exportsDir, `${baseFileName}.${options.format}`);

      // Get main configuration from SecureConfigManager
      const secureManager = SecureConfigManager.getInstance();
      const config = await secureManager.getDecryptedMainConfig(env);

      if (!config) {
        return {
          success: false,
          error: `Main configuration for environment ${env} not found`,
        };
      }

      // Prepare export data
      const exportData: Record<string, unknown> = {
        metadata: {
          id: generateExportId(),
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
      let data: string | Buffer = this.convertFormat(exportData, options.format);

      // Encrypt if requested
      if (options.encrypt) {
        if (!options.encryptionKey) {
          throw new Error('Encryption key is required for encrypted export');
        }
        data = await encryptData(data, options.encryptionKey);
        filePath += '.enc';
      }

      // Compress if requested
      if (options.compress) {
        data = await compressData(data);
        filePath += '.gz';
      }

      // Write to file
      await fs.writeFile(filePath, data);

      // Calculate checksum
      const checksum = calculateChecksum(data);

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
        error: ErrorUtils.getMessage(error),
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
      const fileName = path.basename(filePath);
      const envMatch = fileName.match(/(default|development|production|test)/);
      const env = envMatch ? envMatch[1] : 'default';

      // Decompress if needed
      if (filePath.endsWith('.gz')) {
        data = await decompressData(data);
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
            const configPath = path.join(secureManager['mainConfigDir'], `${env}.json.enc`);
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
        data = await decryptData(data, options.decryptionKey as string);
      }

      // Parse data based on format
      let importData: any;
      const format = detectFormat(filePath);

      switch (format) {
        case 'json':
          importData = JSON.parse(data.toString());
          break;
        case 'yaml':
          importData = parseYAML(data.toString());
          break;
        case 'csv':
          importData = parseCSV(data.toString());
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }

      // Validate import data structure
      const configToSave = importData.config || importData;

      // Save using SecureConfigManager
      const secureManager = SecureConfigManager.getInstance();
      const encryptedConfig = secureManager.encrypt(JSON.stringify(configToSave));
      const configPath = path.join(secureManager['mainConfigDir'], `${env}.json.enc`);
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
        errors: [ErrorUtils.getMessage(error)],
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
        data = await decompressData(data);
      }

      // Decrypt if needed
      if (filePath.endsWith('.enc')) {
        if (!options.decryptionKey) {
          throw new Error('Decryption key is required for encrypted import');
        }
        data = await decryptData(data, options.decryptionKey as string);
      }

      // Parse data based on format
      let importData: any;
      const format = detectFormat(filePath);

      switch (format) {
        case 'json':
          importData = JSON.parse(data.toString());
          break;
        case 'yaml':
          importData = parseYAML(data.toString());
          break;
        case 'csv':
          importData = parseCSV(data.toString());
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

      // Bulk fetch existing configurations to prevent N+1 queries
      const configIds = importData.configurations
        .map((c: any) => c.id)
        .filter((id: any) => id != null);

      const existingConfigsMap = new Map<number, any>();
      let bulkFetchSucceeded = false;

      if (configIds.length > 0) {
        try {
          const existingConfigs = await this.dbManager.getBotConfigurationsBulk(configIds);
          for (const ec of existingConfigs) {
            if (ec.id) {
              existingConfigsMap.set(ec.id, ec);
            }
          }
          bulkFetchSucceeded = true;
        } catch (error) {
          debug('Failed to bulk fetch existing configurations:', error);
          // Non-fatal, will fall back to individual queries if bulk fetch fails
        }
      }

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
          let existingConfig = null;
          if (config.id) {
            if (bulkFetchSucceeded) {
              existingConfig = existingConfigsMap.get(config.id) || null;
            } else {
              existingConfig = await this.dbManager.getBotConfiguration(config.id);
            }
          }

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
            `Error processing configuration ${config.name || 'unknown'}: ${ErrorUtils.getMessage(error)}`
          );
          result.errorCount = (result.errorCount || 0) + 1;
        }
      }

      // Process versions if included
      if (importData.versions && !options.validateOnly) {
        // Cache to avoid N+1 queries when importing multiple versions for the same configuration
        const validConfigIds = new Set<number>();
        const invalidConfigIds = new Set<number>();

        // Pre-fetch unique valid configuration IDs in bulk
        const uniqueIdsToCheck = new Set<number>();
        for (const version of importData.versions) {
          const configId = version.botConfigurationId;
          if (!configId) continue;
          if (!validConfigIds.has(configId) && !invalidConfigIds.has(configId)) {
            uniqueIdsToCheck.add(configId);
          }
        }

        const BATCH_SIZE = 50;
        const idsArray = Array.from(uniqueIdsToCheck);

        for (let i = 0; i < idsArray.length; i += BATCH_SIZE) {
          const batch = idsArray.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map(async (configId) => {
              try {
                const config = await this.dbManager.getBotConfiguration(configId);
                if (config) {
                  validConfigIds.add(configId);
                } else {
                  invalidConfigIds.add(configId);
                }
              } catch (error) {
                result.warnings?.push(
                  `Error fetching configuration ${configId}: ${ErrorUtils.getMessage(error)}`
                );
                invalidConfigIds.add(configId);
              }
            })
          );
        }

        for (const version of importData.versions) {
          try {
            const configId = version.botConfigurationId;
            if (!configId) continue;
            const isValid = validConfigIds.has(configId);

            if (isValid) {
              await this.dbManager.createBotConfigurationVersion(version);
            }
          } catch (error) {
            result.warnings?.push(`Error processing version: ${ErrorUtils.getMessage(error)}`);
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
          result.warnings?.push(
            `Error fetching existing templates: ${ErrorUtils.getMessage(error)}`
          );
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
                  result.warnings?.push(
                    `Error processing template: ${ErrorUtils.getMessage(error)}`
                  );
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
        errors: [ErrorUtils.getMessage(error)],
      };
    }
  }

  // ---- Backup delegation ----

  /**
   * Create a backup of all configurations.
   */
  async createBackup(
    name: string,
    description?: string,
    createdBy?: string,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    return this.backupManager.createBackup(name, description, createdBy, options);
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(
    backupPath: string,
    options: Partial<ImportOptions> = {},
    restoredBy?: string
  ): Promise<ImportResult> {
    return this.backupManager.restoreFromBackup(backupPath, options, restoredBy);
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupMetadata[]> {
    return this.backupManager.listBackups();
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    return this.backupManager.deleteBackup(backupId);
  }

  /**
   * Get the full path for a backup file by ID.
   */
  public async getBackupFilePath(backupId: string): Promise<string | null> {
    return this.backupManager.getBackupFilePath(backupId);
  }

  // ---- Private helpers (delegating to extracted modules) ----

  /**
   * Convert export data to the requested format.
   */
  private convertFormat(exportData: Record<string, unknown>, format: string): string {
    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      case 'yaml':
        return convertToYAML(exportData);
      case 'csv':
        return convertToCSV(exportData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}
