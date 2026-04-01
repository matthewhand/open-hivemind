/**
 * ConfigImporter
 *
 * Encapsulates the import-side logic for configurations:
 *   - importConfigurations  – import bot configurations from a file
 *   - importMainConfig      – import the application's main environment config
 *
 * Callers should obtain an instance via `ConfigImporter.create()`.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import Debug from 'debug';
import { DatabaseManager } from '../../../database/DatabaseManager';
import { SecureConfigManager } from '../../../config/SecureConfigManager';
import { ErrorUtils } from '../../../types/errors';
import { ConfigurationValidator } from '../ConfigurationValidator';
import { ConfigurationTemplateService } from '../ConfigurationTemplateService';
import {
  decryptData,
  decompressData,
} from '../configImportExport/cryptoUtils';
import { detectFormat, parseYAML, parseCSV } from '../configImportExport/formatConverters';
import type { ImportOptions, ImportResult } from '../configImportExport/types';

const debug = Debug('app:ConfigImporter');

export class ConfigImporter {
  private constructor(
    private readonly dbManager: DatabaseManager,
    private readonly configValidator: ConfigurationValidator,
    private readonly templateService: ConfigurationTemplateService
  ) {}

  /** Factory – preferred way to create an instance. */
  static create(): ConfigImporter {
    return new ConfigImporter(
      DatabaseManager.getInstance(),
      new ConfigurationValidator(),
      ConfigurationTemplateService.getInstance()
    );
  }

  /**
   * Import the application's main environment configuration.
   *
   * Handles decompression, decryption, format parsing, and persistence via
   * SecureConfigManager.
   */
  async importMainConfig(
    filePath: string,
    options: ImportOptions,
    importedBy?: string
  ): Promise<ImportResult> {
    try {
      let data: Buffer | string = await fs.readFile(filePath);

      const fileName = path.basename(filePath);
      const envMatch = fileName.match(/(default|development|production|test)/);
      const env = envMatch ? envMatch[1] : 'default';

      if (filePath.endsWith('.gz')) {
        data = await decompressData(data as Buffer);
      }

      if (filePath.endsWith('.enc')) {
        const strData = data.toString('utf8');
        try {
          const parsed = JSON.parse(strData);
          if (parsed.iv && parsed.authTag && parsed.data) {
            // SecureConfigManager-encrypted format
            const secureManager = await SecureConfigManager.getInstance();
            const decryptedStr = secureManager.decrypt(strData);
            const importData = JSON.parse(decryptedStr);
            const configToSave = importData.config || importData;
            const encryptedConfig = secureManager.encrypt(JSON.stringify(configToSave));
            const configPath = path.join(
              secureManager['mainConfigDir'] as string,
              `${env}.json.enc`
            );
            await fs.writeFile(configPath, encryptedConfig);
            return {
              success: true,
              importedCount: 1,
              warnings: [`Main configuration for ${env} imported and encrypted`],
            };
          }
        } catch {
          // Not SecureConfigManager format – fall through to own decryption
        }

        if (!options.decryptionKey) {
          throw new Error('Decryption key is required for encrypted import');
        }
        data = await decryptData(data as Buffer, options.decryptionKey as string);
      }

      const format = detectFormat(filePath);
      let importData: Record<string, unknown>;

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

      const configToSave = (importData.config as Record<string, unknown>) || importData;
      const secureManager = await SecureConfigManager.getInstance();
      const encryptedConfig = secureManager.encrypt(JSON.stringify(configToSave));
      const configPath = path.join(
        secureManager['mainConfigDir'] as string,
        `${env}.json.enc`
      );
      await fs.writeFile(configPath, encryptedConfig);

      debug(`Imported main configuration for ${env} from ${filePath}`);

      return {
        success: true,
        importedCount: 1,
        warnings: [`Main configuration for ${env} imported and encrypted`],
      };
    } catch (error) {
      debug('Error importing main configuration:', error);
      return { success: false, errors: [ErrorUtils.getMessage(error)] };
    }
  }

  /**
   * Import bot configurations from a file.
   *
   * Note on caching: Version import pre-fetches unique config IDs in batches to
   * avoid N+1 DB queries. Template import fetches all existing IDs once, then
   * creates missing templates concurrently in batches of 50.
   */
  async importConfigurations(
    filePath: string,
    options: ImportOptions,
    importedBy?: string
  ): Promise<ImportResult> {
    try {
      let data: Buffer | string = await fs.readFile(filePath);

      if (filePath.endsWith('.gz')) {
        data = await decompressData(data as Buffer);
      }

      if (filePath.endsWith('.enc')) {
        if (!options.decryptionKey) {
          throw new Error('Decryption key is required for encrypted import');
        }
        data = await decryptData(data as Buffer, options.decryptionKey as string);
      }

      const format = detectFormat(filePath);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let importData: any;

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

      // Bulk-fetch existing configs to avoid N+1 queries
      const configIds = importData.configurations
        .map((c: { id?: unknown }) => c.id)
        .filter((id: unknown) => id != null);

      const existingConfigsMap = new Map<number, unknown>();
      let bulkFetchSucceeded = false;

      if (configIds.length > 0) {
        try {
          const existingConfigs = await this.dbManager.getBotConfigurationsBulk(configIds);
          for (const ec of existingConfigs) {
            if ((ec as { id?: number }).id) {
              existingConfigsMap.set((ec as { id: number }).id, ec);
            }
          }
          bulkFetchSucceeded = true;
        } catch (error) {
          debug('Failed to bulk fetch existing configurations:', error);
        }
      }

      // Process each configuration
      for (const config of importData.configurations) {
        try {
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

          if (options.validateOnly) continue;

          let existingConfig = null;
          if (config.id) {
            existingConfig = bulkFetchSucceeded
              ? (existingConfigsMap.get(config.id) ?? null)
              : await this.dbManager.getBotConfiguration(config.id);
          }

          if (existingConfig && !options.overwrite) {
            result.skippedCount = (result.skippedCount || 0) + 1;
            result.warnings?.push(`Configuration ${config.name} already exists, skipping`);
            continue;
          }

          if (existingConfig && options.overwrite) {
            if ((existingConfig as { id?: number }).id) {
              await this.dbManager.updateBotConfiguration(
                (existingConfig as { id: number }).id,
                config
              );
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

      // Import version history if present
      if (importData.versions && !options.validateOnly) {
        await this.importVersions(importData.versions, result);
      }

      // Import templates if present
      if (importData.templates && !options.validateOnly) {
        await this.importTemplates(importData.templates, result, importedBy);
      }

      debug(`Imported ${result.importedCount} configurations from ${filePath}`);
      return result;
    } catch (error) {
      debug('Error importing configurations:', error);
      return { success: false, errors: [ErrorUtils.getMessage(error)] };
    }
  }

  // ---- Private helpers ----

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async importVersions(versions: any[], result: ImportResult): Promise<void> {
    const validConfigIds = new Set<number>();
    const invalidConfigIds = new Set<number>();
    const uniqueIdsToCheck = new Set<number>();

    for (const version of versions) {
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

    for (const version of versions) {
      try {
        const configId = version.botConfigurationId;
        if (!configId || !validConfigIds.has(configId)) continue;
        await this.dbManager.createBotConfigurationVersion(version);
      } catch (error) {
        result.warnings?.push(`Error processing version: ${ErrorUtils.getMessage(error)}`);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async importTemplates(templates: any[], result: ImportResult, importedBy?: string): Promise<void> {
    const BATCH_SIZE = 50;

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

    for (let i = 0; i < templates.length; i += BATCH_SIZE) {
      const batch = templates.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch
          .filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (template: any) =>
              !allExistingTemplateIds.has(template.id) &&
              !newlyCreatedTemplateIds.has(template.id)
          )
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
}
