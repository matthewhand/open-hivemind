import Logger from '@common/logger';
import { type BackupMetadata } from './configImportExport';
import { ConfigurationImportExportService } from './ConfigurationImportExportService';

const logger = Logger.withContext('BackupSchedulerService');

/**
 * Service to automatically schedule configuration backups and enforce a retention policy.
 */
export class BackupSchedulerService {
  private static instance: BackupSchedulerService;
  private interval: NodeJS.Timeout | null = null;
  private readonly BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly RETENTION_COUNT = 7;

  private constructor() {}

  /**
   * Get the singleton instance of the BackupSchedulerService.
   */
  public static getInstance(): BackupSchedulerService {
    if (!BackupSchedulerService.instance) {
      BackupSchedulerService.instance = new BackupSchedulerService();
    }
    return BackupSchedulerService.instance;
  }

  /**
   * Start the backup scheduler.
   */
  public start(): void {
    if (this.interval) {
      logger.warn('Backup scheduler is already running');
      return;
    }

    logger.info('Starting automated configuration backup scheduler', {
      intervalHours: 24,
      retentionCount: this.RETENTION_COUNT,
    });

    // Schedule the first backup after a short delay (e.g., 1 minute) to avoid startup congestion
    setTimeout(() => {
      this.performBackup().catch((err) => {
        logger.error('Initial automated backup failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }, 60000);

    // Set up the daily interval
    this.interval = setInterval(() => {
      this.performBackup().catch((err) => {
        logger.error('Scheduled automated backup failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }, this.BACKUP_INTERVAL);
  }

  /**
   * Stop the backup scheduler.
   */
  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('Stopped automated configuration backup scheduler');
    }
  }

  /**
   * Perform a single backup operation and apply retention policy.
   */
  private async performBackup(): Promise<void> {
    const configService = ConfigurationImportExportService.getInstance();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `auto-backup-${timestamp}`;

    logger.info('Starting automated configuration backup', { name: backupName });

    try {
      const result = await configService.createBackup(
        backupName,
        'Automated daily configuration backup',
        'SYSTEM'
      );

      if (result.success) {
        logger.info('Automated backup completed successfully', {
          fileName: result.filePath ? result.filePath.split('/').pop() : 'unknown',
          size: result.size,
        });

        await this.applyRetentionPolicy();
      } else {
        logger.error('Automated backup failed', { error: result.error });
      }
    } catch (error) {
      logger.error('Automated backup execution error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Enforce the retention policy by keeping only the most recent backups.
   */
  private async applyRetentionPolicy(): Promise<void> {
    const configService = ConfigurationImportExportService.getInstance();

    try {
      const backups: BackupMetadata[] = await configService.listBackups();

      // listBackups already returns backups sorted by createdAt descending (newest first)
      if (backups.length > this.RETENTION_COUNT) {
        const toDelete = backups.slice(this.RETENTION_COUNT);

        logger.info(`Applying retention policy: deleting ${toDelete.length} old backups`, {
          totalBackups: backups.length,
          retentionLimit: this.RETENTION_COUNT,
        });

        for (const backup of toDelete) {
          try {
            await configService.deleteBackup(backup.id);
            logger.debug('Deleted old backup', { backupId: backup.id, name: backup.name });
          } catch (err) {
            logger.warn('Failed to delete old backup', {
              backupId: backup.id,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to apply backup retention policy', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
