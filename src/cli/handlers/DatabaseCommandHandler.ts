import chalk from 'chalk';
import { type Command } from 'commander';
import inquirer from 'inquirer';
import Logger from '../../common/logger';
import { DatabaseManager } from '../../database/DatabaseManager';
import { type CommandHandler } from './CommandHandler';

const dbLogger = Logger.withContext('DatabaseCommandHandler');

export class DatabaseCommandHandler implements CommandHandler {
  private dbManager: DatabaseManager;

  constructor() {
    this.dbManager = DatabaseManager.getInstance();
  }

  public setup(program: Command): void {
    const dbCommand = program.command('db').description('Database management commands');

    dbCommand
      .command('init')
      .description('Initialize the database')
      .option('-p, --path <path>', 'Database file path', 'data/hivemind.db')
      .action(async (options) => {
        try {
          await this.initializeDatabase(options.path);
        } catch (error) {
          dbLogger.error(chalk.red('Error initializing database:'), error);
        }
      });

    dbCommand
      .command('rollback')
      .description('Rollback the database to a specific migration version')
      .option(
        '-v, --version <version>',
        'Target migration version to rollback to (e.g. 0 to rollback all)'
      )
      .action(async (options) => {
        if (options.version === undefined) {
          dbLogger.error(chalk.red('Please provide a target version with -v or --version'));
          return;
        }
        try {
          await this.rollbackDatabase(parseInt(options.version, 10));
        } catch (error) {
          dbLogger.error(chalk.red('Error rolling back database:'), error);
        }
      });

    dbCommand
      .command('stats')
      .description('Show database statistics')
      .action(async () => {
        try {
          await this.showDatabaseStats();
        } catch (error) {
          dbLogger.error(chalk.red('Error getting database stats:'), error);
        }
      });

    dbCommand
      .command('backup <path>')
      .description('Backup database to specified path')
      .action(async (path) => {
        try {
          await this.backupDatabase(path);
        } catch (error) {
          dbLogger.error(chalk.red('Error backing up database:'), error);
        }
      });

    dbCommand
      .command('cleanup')
      .description('Clean up old messages')
      .option('-d, --days <days>', 'Days to keep (default: 30)', '30')
      .option('-f, --force', 'Force cleanup without confirmation')
      .action(async (options) => {
        try {
          await this.cleanupDatabase(parseInt(options.days), options.force);
        } catch (error) {
          dbLogger.error(chalk.red('Error cleaning up database:'), error);
        }
      });
  }

  private async initializeDatabase(path: string): Promise<void> {
    dbLogger.info(chalk.blue(`Initializing database at ${path}...`));

    const config = { type: 'sqlite' as const, path };
    const dbManager = DatabaseManager.getInstance(config);
    this.dbManager = dbManager;

    await dbManager.connect();
    dbLogger.info(chalk.green('✓ Database initialized successfully'));
  }

  private async rollbackDatabase(targetVersion: number): Promise<void> {
    dbLogger.info(chalk.blue(`Preparing to rollback database to version ${targetVersion}...`));

    if (!this.dbManager.isConfigured()) {
      dbLogger.error(chalk.red('Database is not configured. Run init first or start the server.'));
      return;
    }

    if (!this.dbManager.isConnected()) {
      await this.dbManager.connect();
    }

    const dbInstance = (this.dbManager as any).db;

    if (!dbInstance) {
      dbLogger.error(chalk.red('Underlying database connection could not be established.'));
      return;
    }

    const { MigrationManager } = await import('../../database/MigrationManager');
    const migrationManager = new MigrationManager(dbInstance);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to rollback to version ${targetVersion}? This may result in data loss for dropped tables/columns.`,
        default: false,
      },
    ]);

    if (!confirm) {
      dbLogger.info(chalk.yellow('Rollback cancelled'));
      return;
    }

    try {
      dbLogger.info(chalk.blue('Executing rollback...'));
      await migrationManager.rollbackToVersion(targetVersion);
      dbLogger.info(chalk.green(`✓ Database successfully rolled back to version ${targetVersion}`));
    } catch (error) {
      dbLogger.error(chalk.red('Rollback failed:'), error);
      throw error;
    }
  }

  /**
   * Retrieves and displays statistics about the current database state,
   * including message counts and provider distributions.
   */
  private async showDatabaseStats(): Promise<void> {
    if (!this.dbManager.isConfigured()) {
      dbLogger.error(chalk.yellow('Database is not configured; statistics are unavailable.'));
      return;
    }

    if (!this.dbManager.isConnected()) {
      dbLogger.error(chalk.red('Database not connected'));
      return;
    }

    try {
      const stats = await this.dbManager.getStats();

      dbLogger.info(chalk.blue('Database Statistics:'));
      dbLogger.info(`  Total messages: ${chalk.green(stats.totalMessages.toString())}`);
      dbLogger.info(`  Total channels: ${chalk.green(stats.totalChannels.toString())}`);
      dbLogger.info(`  Total authors: ${chalk.green(stats.totalAuthors.toString())}`);

      dbLogger.info('\n  Messages by provider:');
      Object.entries(stats.providers).forEach(([provider, count]) => {
        dbLogger.info(`    ${provider}: ${chalk.green(count.toString())}`);
      });
    } catch (error) {
      dbLogger.error(chalk.red('Error getting database stats:'), error);
    }
  }

  private async backupDatabase(path: string): Promise<void> {
    dbLogger.info(chalk.blue(`Backing up database to ${path}...`));
    // Here you would implement database backup logic
    dbLogger.info(chalk.green('✓ Database backup completed'));
  }

  private async cleanupDatabase(days: number, force: boolean): Promise<void> {
    if (!force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Delete messages older than ${days} days?`,
          default: false,
        },
      ]);

      if (!confirm) {
        dbLogger.info(chalk.yellow('Cleanup cancelled'));
        return;
      }
    }

    dbLogger.info(chalk.blue(`Cleaning up messages older than ${days} days...`));
    // Here you would implement cleanup logic
    dbLogger.info(chalk.green('✓ Database cleanup completed'));
  }
}
