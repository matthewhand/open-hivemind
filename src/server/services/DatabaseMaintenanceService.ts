import Debug from 'debug';
import { injectable, singleton } from 'tsyringe';
import Logger from '../../common/logger';
import { DatabaseManager } from '../../database/DatabaseManager';
import databaseConfig from '../../config/databaseConfig';

const debug = Debug('app:services:DatabaseMaintenanceService');
const logger = Logger.withContext('DatabaseMaintenance');

/**
 * Service to handle database maintenance tasks:
 * 1. Keep-Alive: Prevents cloud databases (like Neon.tech) from scaling to zero.
 * 2. Auto-Cleanup: Regularly prunes history and logs based on retention policies.
 */
export class DatabaseMaintenanceService {
  private static instance: DatabaseMaintenanceService;
  private maintenanceInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Keep-alive every 4 minutes (Neon scales to zero after 5)
  private readonly keepAliveIntervalMs = 4 * 60 * 1000;
  // Cleanup once every 24 hours
  private readonly cleanupIntervalMs = 24 * 60 * 60 * 1000;

  private constructor() {}

  public static getInstance(): DatabaseMaintenanceService {
    if (!DatabaseMaintenanceService.instance) {
      DatabaseMaintenanceService.instance = new DatabaseMaintenanceService();
    }
    return DatabaseMaintenanceService.instance;
  }

  /**
   * Start the maintenance loops
   */
  public start(): void {
    if (this.maintenanceInterval) return;

    logger.info('Starting Database Maintenance Service');

    // 1. Setup Keep-Alive (Ping)
    this.maintenanceInterval = setInterval(() => {
      this.pingDatabase().catch(err => {
        debug('Database keep-alive ping failed:', err);
      });
    }, this.keepAliveIntervalMs);

    // 2. Setup Daily Cleanup
    this.cleanupInterval = setInterval(() => {
      this.performCleanup().catch(err => {
        logger.error('Database daily cleanup failed', err);
      });
    }, this.cleanupIntervalMs);

    // Initial ping and cleanup check after startup
    setTimeout(() => {
      this.pingDatabase();
      if (databaseConfig.get('AUTO_CLEANUP_ON_STARTUP')) {
         this.performCleanup();
      }
    }, 10000);
  }

  /**
   * Stop the maintenance loops
   */
  public stop(): void {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    logger.info('Database Maintenance Service stopped');
  }

  /**
   * Runs a lightweight query to keep the connection active
   */
  private async pingDatabase(): Promise<void> {
    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) return;

    try {
      // @ts-ignore - accessing internal db for a raw ping
      const db = dbManager.db;
      if (db) {
        await db.get('SELECT 1');
        debug('Database keep-alive ping successful');
      }
    } catch (error) {
      debug('Database ping error:', error);
    }
  }

  /**
   * Triggers the full database cleanup/retention logic
   */
  private async performCleanup(): Promise<void> {
    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) return;

    logger.info('Running scheduled database cleanup...');
    await dbManager.runFullCleanup();
    logger.info('Database cleanup completed');
  }
}
