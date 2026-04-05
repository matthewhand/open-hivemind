/**
 * Backup creation, restoration, listing, and deletion logic for configuration import/export.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import Debug from 'debug';
import { PathSecurityUtils } from '@src/utils/PathSecurityUtils';
import { AuditLogger } from '../../../common/auditLogger';
import { UserConfigStore } from '../../../config/UserConfigStore';
import { ErrorUtils } from '../../../types/errors';
import { generateBackupId } from './cryptoUtils';
import type {
  BackupMetadata,
  ExportOptions,
  ExportResult,
  ImportOptions,
  ImportResult,
} from './types';

const debug = Debug('app:ConfigurationImportExportService');

/**
 * Manages backup lifecycle: creation, restoration, listing, deletion, and retention policy.
 *
 * Requires delegate functions for exportConfigurations and importConfigurations so that it
 * does not need to depend on the full service class directly (avoids circular dependencies).
 */
export class BackupManager {
  private backupsDir: string;

  constructor(
    backupsDir: string,
    private deps: {
      getAllBotConfigurations: () => Promise<Array<{ id?: number }>>;
      exportConfigurations: (
        configIds: number[],
        options: ExportOptions,
        fileName?: string,
        createdBy?: string
      ) => Promise<ExportResult>;
      importConfigurations: (
        filePath: string,
        options: ImportOptions,
        importedBy?: string
      ) => Promise<ImportResult>;
    }
  ) {
    this.backupsDir = backupsDir;
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
      const configs = await this.deps.getAllBotConfigurations();
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

      // Sanitize the backup name first before using it
      const sanitizedName = PathSecurityUtils.sanitizeFilename(name);

      const result = await this.deps.exportConfigurations(
        configIds,
        exportOptions,
        `backup-${sanitizedName}`,
        createdBy
      );

      if (result.success && result.filePath) {
        // Move to backups directory
        const backupTimestamp = Date.now();
        const backupPath = this.getSafeBackupPath(name, new Date(backupTimestamp), exportOptions.encrypt);
        const backupFileName = path.basename(backupPath);
        await fs.rename(result.filePath, backupPath);

        // Create metadata file
        const metadata: BackupMetadata = {
          id: generateBackupId(),
          name: PathSecurityUtils.sanitizeFilename(name),
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

        const metadataPath = path.join(this.backupsDir, `${backupFileName}.meta`);
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
                const oldBackupPath = this.getSafeBackupPath(oldBackup.name, oldBackup.createdAt, oldBackup.encrypted);
                const oldBackupFileName = path.basename(oldBackupPath);
                const coldDir = path.join(process.cwd(), 'config', 'backups', 'cold');
                await fs.mkdir(coldDir, { recursive: true });

                try {
                  await fs.rename(oldBackupPath, path.join(coldDir, oldBackupFileName));
                  // delete metadata to drop from active list
                  await fs.unlink(path.join(this.backupsDir, `${oldBackupFileName}.meta`));

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
        error: ErrorUtils.getMessage(error),
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

      return this.deps.importConfigurations(backupPath, importOptions, restoredBy);
    } catch (error) {
      debug('Error restoring from backup:', error);
      return {
        success: false,
        errors: [ErrorUtils.getMessage(error)],
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
            const metadataPath = path.join(this.backupsDir, file);
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

      const backupPath = this.getSafeBackupPath(backup.name, backup.createdAt, backup.encrypted);
      const backupFileName = path.basename(backupPath);
      const metadataPath = path.join(this.backupsDir, `${backupFileName}.meta`);

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
   * Get safe backup path and filename.
   * Ensures the filename is sanitized and the path stays within the backups directory.
   * Uses PathSecurityUtils for consistent security validation.
   */
  getSafeBackupPath(name: string, createdAt: Date, isEncrypted: boolean = false): string {
    const sanitizedName = PathSecurityUtils.sanitizeFilename(name);
    let backupFileName = `backup-${sanitizedName}-${createdAt.getTime()}.json`;

    if (isEncrypted) {
      backupFileName += '.enc';
    }

    backupFileName += '.gz'; // Compress is always true in createBackup defaults

    // Use PathSecurityUtils for consistent path validation
    return PathSecurityUtils.getSafePath(this.backupsDir, backupFileName);
  }

  /**
   * Get the full path for a backup file by ID.
   * Returns null if backup metadata is not found or path is unsafe.
   */
  async getBackupFilePath(backupId: string): Promise<string | null> {
    try {
      const backups = await this.listBackups();
      const backup = backups.find((b) => b.id === backupId);

      if (!backup) {
        return null;
      }

      return this.getSafeBackupPath(backup.name, backup.createdAt, backup.encrypted);
    } catch (error) {
      debug('Error getting backup file path:', error);
      return null;
    }
  }
}
