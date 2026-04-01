/**
 * ConfigExporter
 *
 * Encapsulates the export-side logic for configurations:
 *   - exportConfigurations  – export selected bot configurations to a file
 *   - exportMainConfig      – export the application's main environment config
 *
 * Callers should obtain an instance via `ConfigExporter.create()` so that all
 * async dependencies are resolved before use.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import Debug from 'debug';
import { DatabaseManager } from '../../../database/DatabaseManager';
import { SecureConfigManager } from '../../../config/SecureConfigManager';
import { ErrorUtils } from '../../../types/errors';
import { ConfigurationTemplateService } from '../ConfigurationTemplateService';
import { ConfigurationVersionService } from '../ConfigurationVersionService';
import {
  encryptData,
  compressData,
  calculateChecksum,
  generateExportId,
} from '../configImportExport/cryptoUtils';
import type { ExportOptions, ExportResult } from '../configImportExport/types';
import { serializeExportData } from './ConfigSerializer';

const debug = Debug('app:ConfigExporter');

export class ConfigExporter {
  private constructor(
    private readonly dbManager: DatabaseManager,
    private readonly templateService: ConfigurationTemplateService,
    private readonly versionService: ConfigurationVersionService,
    private readonly exportsDir: string
  ) {}

  /** Factory – preferred way to create an instance. */
  static create(exportsDir: string): ConfigExporter {
    return new ConfigExporter(
      DatabaseManager.getInstance(),
      ConfigurationTemplateService.getInstance(),
      ConfigurationVersionService.getInstance(),
      exportsDir
    );
  }

  /**
   * Export a set of bot configurations to a file.
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

      // Fetch requested configurations
      const configs = [];
      for (const id of configIds) {
        const config = await this.dbManager.getBotConfiguration(id);
        if (config) {
          configs.push(config);
        }
      }

      if (configs.length === 0) {
        return { success: false, error: 'No configurations found to export' };
      }

      // Build export payload
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

      // Optionally include version history
      if (options.includeVersions) {
        const versionPromises = configs
          .filter((c) => c.id != null)
          .map(async (config) => this.dbManager.getBotConfigurationVersions(config.id as number));
        const settled = await Promise.allSettled(versionPromises);
        const versions = settled
          .map((r) => (r.status === 'fulfilled' ? r.value : []))
          .flat();
        exportData.versions = versions;
        (exportData.metadata as Record<string, unknown>).versionCount = versions.length;
      }

      // Optionally include templates
      if (options.includeTemplates) {
        const templates = await this.templateService.getAllTemplates();
        exportData.templates = templates;
        (exportData.metadata as Record<string, unknown>).templateCount = templates.length;
      }

      // Optionally include audit logs
      if (options.includeAuditLogs) {
        const auditLogs: unknown[] = [];
        const ids = configs.map((c) => c.id).filter(Boolean) as number[];
        if (ids.length > 0) {
          const auditMap = await this.dbManager.getBotConfigurationAuditBulk(ids);
          for (const config of configs) {
            if (config.id) {
              auditLogs.push(...(auditMap.get(config.id) || []));
            }
          }
        }
        exportData.auditLogs = auditLogs;
      }

      // Serialize → optionally encrypt → optionally compress
      let data: string | Buffer = serializeExportData(exportData, options.format);

      if (options.encrypt) {
        if (!options.encryptionKey) {
          throw new Error('Encryption key is required for encrypted export');
        }
        data = await encryptData(data, options.encryptionKey);
        filePath += '.enc';
      }

      if (options.compress) {
        data = await compressData(data);
        filePath += '.gz';
      }

      await fs.writeFile(filePath, data);
      const checksum = calculateChecksum(data);

      debug(`Exported ${configs.length} configurations to ${filePath}`);

      return { success: true, filePath, size: data.length, checksum };
    } catch (error) {
      debug('Error exporting configurations:', error);
      return { success: false, error: ErrorUtils.getMessage(error) };
    }
  }

  /**
   * Export the application's main environment configuration file.
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

      const secureManager = await SecureConfigManager.getInstance();
      const config = await secureManager.getDecryptedMainConfig(env);

      if (!config) {
        return {
          success: false,
          error: `Main configuration for environment ${env} not found`,
        };
      }

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

      let data: string | Buffer = serializeExportData(exportData, options.format);

      if (options.encrypt) {
        if (!options.encryptionKey) {
          throw new Error('Encryption key is required for encrypted export');
        }
        data = await encryptData(data, options.encryptionKey);
        filePath += '.enc';
      }

      if (options.compress) {
        data = await compressData(data);
        filePath += '.gz';
      }

      await fs.writeFile(filePath, data);
      const checksum = calculateChecksum(data);

      debug(`Exported main configuration for ${env} to ${filePath}`);

      return { success: true, filePath, size: Buffer.byteLength(data), checksum };
    } catch (error) {
      debug('Error exporting main configuration:', error);
      return { success: false, error: ErrorUtils.getMessage(error) };
    }
  }
}
