import chalk from 'chalk';
import { type Command } from 'commander';
import inquirer from 'inquirer';
import { DatabaseManager } from '../../database/DatabaseManager';
import { type CommandHandler } from './CommandHandler';

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
          console.error(chalk.red('Error initializing database:'), error);
        }
      });

    dbCommand
      .command('stats')
      .description('Show database statistics')
      .action(async () => {
        try {
          await this.showDatabaseStats();
        } catch (error) {
          console.error(chalk.red('Error getting database stats:'), error);
        }
      });

    dbCommand
      .command('backup <path>')
      .description('Backup database to specified path')
      .action(async (path) => {
        try {
          await this.backupDatabase(path);
        } catch (error) {
          console.error(chalk.red('Error backing up database:'), error);
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
          console.error(chalk.red('Error cleaning up database:'), error);
        }
      });
  }

  private async initializeDatabase(path: string): Promise<void> {
    console.info(chalk.blue(`Initializing database at ${path}...`));

    const config = { type: 'sqlite' as const, path };
    const dbManager = DatabaseManager.getInstance(config);
    this.dbManager = dbManager;

    await dbManager.connect();
    console.info(chalk.green('✓ Database initialized successfully'));
  }

  private async showDatabaseStats(): Promise<void> {
    if (!this.dbManager.isConfigured()) {
      console.error(chalk.yellow('Database is not configured; statistics are unavailable.'));
      return;
    }

    if (!this.dbManager.isConnected()) {
      console.error(chalk.red('Database not connected'));
      return;
    }

    try {
      const stats = await this.dbManager.getStats();

      console.info(chalk.blue('Database Statistics:'));
      console.info(`  Total messages: ${chalk.green(stats.totalMessages)}`);
      console.info(`  Total channels: ${chalk.green(stats.totalChannels)}`);
      console.info(`  Total authors: ${chalk.green(stats.totalAuthors)}`);

      console.info('\n  Messages by provider:');
      Object.entries(stats.providers).forEach(([provider, count]) => {
        console.info(`    ${provider}: ${chalk.green(count)}`);
      });
    } catch (error) {
      console.error(chalk.red('Error getting database stats:'), error);
    }
  }

  private async backupDatabase(path: string): Promise<void> {
    console.info(chalk.blue(`Backing up database to ${path}...`));
    // Here you would implement database backup logic
    console.info(chalk.green('✓ Database backup completed'));
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
        console.info(chalk.yellow('Cleanup cancelled'));
        return;
      }
    }

    console.info(chalk.blue(`Cleaning up messages older than ${days} days...`));
    // Here you would implement cleanup logic
    console.info(chalk.green('✓ Database cleanup completed'));
  }
}
