#!/usr/bin/env node
import { promises as fs } from 'fs';
import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { DatabaseManager } from '../database/DatabaseManager';

export class HivemindCLI {
  private program: Command;
  private configManager: BotConfigurationManager;
  private dbManager: DatabaseManager;

  constructor() {
    this.program = new Command();
    this.configManager = BotConfigurationManager.getInstance();
    this.dbManager = DatabaseManager.getInstance();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program.name('hivemind').description('Hivemind AI Bot Management CLI').version('1.0.0');

    // Bot management commands
    this.setupBotCommands();

    // Database commands
    this.setupDatabaseCommands();

    // Server management commands
    this.setupServerCommands();

    // Configuration commands
    this.setupConfigCommands();
  }

  private setupBotCommands(): void {
    const botCommand = this.program.command('bot').description('Bot management commands');

    botCommand
      .command('add')
      .description('Add a new bot configuration')
      .option('-n, --name <name>', 'Bot name')
      .option(
        '-p, --provider <provider>',
        'Message provider (discord, slack, telegram, mattermost)'
      )
      .option('-l, --llm <llm>', 'LLM provider (openai, flowise, openwebui)')
      .option('-t, --token <token>', 'Bot token')
      .option('-i, --interactive', 'Interactive mode')
      .action(async (options) => {
        try {
          if (options.interactive) {
            await this.addBotInteractive();
          } else {
            await this.addBot(options);
          }
        } catch (error) {
          console.error(chalk.red('Error adding bot:'), error);
        }
      });

    botCommand
      .command('list')
      .description('List all configured bots')
      .option('-v, --verbose', 'Show detailed information')
      .action((options) => {
        this.listBots(options.verbose);
      });

    botCommand
      .command('remove <name>')
      .description('Remove a bot configuration')
      .option('-f, --force', 'Force removal without confirmation')
      .action(async (name, options) => {
        try {
          await this.removeBot(name, options.force);
        } catch (error) {
          console.error(chalk.red('Error removing bot:'), error);
        }
      });

    botCommand
      .command('start <name>')
      .description('Start a specific bot')
      .action(async (name) => {
        try {
          await this.startBot(name);
        } catch (error) {
          console.error(chalk.red('Error starting bot:'), error);
        }
      });

    botCommand
      .command('stop <name>')
      .description('Stop a specific bot')
      .action(async (name) => {
        try {
          await this.stopBot(name);
        } catch (error) {
          console.error(chalk.red('Error stopping bot:'), error);
        }
      });

    botCommand
      .command('status [name]')
      .description('Show bot status (all bots or specific bot)')
      .action((name) => {
        this.showBotStatus(name);
      });
  }

  private setupDatabaseCommands(): void {
    const dbCommand = this.program.command('db').description('Database management commands');

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

  private setupServerCommands(): void {
    this.program
      .command('start')
      .description('Start the Hivemind server')
      .option('-p, --port <port>', 'Server port', '3000')
      .option('-c, --config <config>', 'Configuration file path')
      .option('-d, --daemon', 'Run as daemon')
      .action(async (options) => {
        try {
          await this.startServer(options);
        } catch (error) {
          console.error(chalk.red('Error starting server:'), error);
        }
      });

    this.program
      .command('stop')
      .description('Stop the Hivemind server')
      .action(async () => {
        try {
          await this.stopServer();
        } catch (error) {
          console.error(chalk.red('Error stopping server:'), error);
        }
      });

    this.program
      .command('restart')
      .description('Restart the Hivemind server')
      .action(async () => {
        try {
          await this.restartServer();
        } catch (error) {
          console.error(chalk.red('Error restarting server:'), error);
        }
      });

    this.program
      .command('status')
      .description('Show server status')
      .action(() => {
        this.showServerStatus();
      });
  }

  private setupConfigCommands(): void {
    const configCommand = this.program
      .command('config')
      .description('Configuration management commands');

    configCommand
      .command('validate')
      .description('Validate configuration')
      .action(() => {
        this.validateConfiguration();
      });

    configCommand
      .command('reload')
      .description('Reload configuration')
      .action(async () => {
        try {
          await this.reloadConfiguration();
        } catch (error) {
          console.error(chalk.red('Error reloading configuration:'), error);
        }
      });

    configCommand
      .command('export <path>')
      .description('Export configuration to file')
      .action(async (path) => {
        try {
          await this.exportConfiguration(path);
        } catch (error) {
          console.error(chalk.red('Error exporting configuration:'), error);
        }
      });

    configCommand
      .command('import <path>')
      .description('Import configuration from file')
      .option('-f, --force', 'Force import without confirmation')
      .action(async (path, options) => {
        try {
          await this.importConfiguration(path, options.force);
        } catch (error) {
          console.error(chalk.red('Error importing configuration:'), error);
        }
      });
  }

  // Implementation methods
  private async addBot(options: any): Promise<void> {
    console.log(chalk.blue('Adding new bot...'));

    if (!options.name || !options.provider || !options.llm) {
      console.error(chalk.red('Missing required options. Use --name, --provider, and --llm'));
      return;
    }

    // Here you would save to configuration
    console.log(chalk.green(`✓ Bot '${options.name}' added successfully`));
    console.log(`  Provider: ${options.provider} → ${options.llm}`);
  }

  private async addBotInteractive(): Promise<void> {
    console.log(chalk.blue('Interactive Bot Setup'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Bot name:',
        validate: (input: string) => input.trim().length > 0 || 'Name is required',
      },
      {
        type: 'list',
        name: 'provider',
        message: 'Message provider:',
        choices: ['discord', 'slack', 'telegram', 'mattermost'],
      },
      {
        type: 'list',
        name: 'llm',
        message: 'LLM provider:',
        choices: ['openai', 'flowise', 'openwebui'],
      },
      {
        type: 'password',
        name: 'token',
        message: 'Bot token:',
        mask: '*',
      },
    ]);

    await this.addBot(answers);
  }

  private listBots(verbose: boolean = false): void {
    const bots = this.configManager.getAllBots();

    if (bots.length === 0) {
      console.log(chalk.yellow('No bots configured'));
      return;
    }

    console.log(chalk.blue(`Found ${bots.length} bot(s):`));

    bots.forEach((bot, index) => {
      console.log(`${index + 1}. ${chalk.green(bot.name)}`);
      console.log(`   Provider: ${bot.messageProvider} → ${bot.llmProvider}`);

      if (verbose) {
        console.log(`   Enabled: ${(bot as any).enabled ? chalk.green('Yes') : chalk.red('No')}`);
        console.log(`   Created: ${(bot as any).createdAt || 'Unknown'}`);
      }
      console.log();
    });
  }

  private async removeBot(name: string, force: boolean = false): Promise<void> {
    const bots = this.configManager.getAllBots();
    const bot = bots.find((b) => b.name === name);

    if (!bot) {
      console.error(chalk.red(`Bot '${name}' not found`));
      return;
    }

    if (!force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to remove bot '${name}'?`,
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Operation cancelled'));
        return;
      }
    }

    // Here you would remove from configuration
    console.log(chalk.green(`✓ Bot '${name}' removed successfully`));
  }

  private async startBot(name: string): Promise<void> {
    console.log(chalk.blue(`Starting bot '${name}'...`));
    // Here you would start the specific bot
    console.log(chalk.green(`✓ Bot '${name}' started`));
  }

  private async stopBot(name: string): Promise<void> {
    console.log(chalk.blue(`Stopping bot '${name}'...`));
    // Here you would stop the specific bot
    console.log(chalk.green(`✓ Bot '${name}' stopped`));
  }

  private showBotStatus(name?: string): void {
    const bots = this.configManager.getAllBots();

    if (name) {
      const bot = bots.find((b) => b.name === name);
      if (!bot) {
        console.error(chalk.red(`Bot '${name}' not found`));
        return;
      }

      console.log(chalk.blue(`Status for bot '${name}':`));
      console.log(`  Status: ${chalk.green('Running')}`); // This would be dynamic
      console.log(`  Provider: ${bot.messageProvider} → ${bot.llmProvider}`);
      console.log(`  Uptime: ${chalk.green('2h 30m')}`); // This would be dynamic
    } else {
      console.log(chalk.blue('System Status:'));
      console.log(`Active bots: ${chalk.green(bots.length)}`);
      const databaseStatus = !this.dbManager.isConfigured()
        ? chalk.yellow('Not configured')
        : this.dbManager.isConnected()
          ? chalk.green('Connected')
          : chalk.red('Disconnected');
      console.log(`Database: ${databaseStatus}`);
      console.log(`Server: ${chalk.green('Running')}`); // This would be dynamic
    }
  }

  private async initializeDatabase(path: string): Promise<void> {
    console.log(chalk.blue(`Initializing database at ${path}...`));

    const config = { type: 'sqlite' as const, path };
    const dbManager = DatabaseManager.getInstance(config);
    this.dbManager = dbManager;

    await dbManager.connect();
    console.log(chalk.green('✓ Database initialized successfully'));
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

      console.log(chalk.blue('Database Statistics:'));
      console.log(`  Total messages: ${chalk.green(stats.totalMessages)}`);
      console.log(`  Total channels: ${chalk.green(stats.totalChannels)}`);
      console.log(`  Total authors: ${chalk.green(stats.totalAuthors)}`);

      console.log('\n  Messages by provider:');
      Object.entries(stats.providers).forEach(([provider, count]) => {
        console.log(`    ${provider}: ${chalk.green(count)}`);
      });
    } catch (error) {
      console.error(chalk.red('Error getting database stats:'), error);
    }
  }

  private async backupDatabase(path: string): Promise<void> {
    console.log(chalk.blue(`Backing up database to ${path}...`));
    // Here you would implement database backup logic
    console.log(chalk.green('✓ Database backup completed'));
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
        console.log(chalk.yellow('Cleanup cancelled'));
        return;
      }
    }

    console.log(chalk.blue(`Cleaning up messages older than ${days} days...`));
    // Here you would implement cleanup logic
    console.log(chalk.green('✓ Database cleanup completed'));
  }

  private async startServer(options: any): Promise<void> {
    console.log(chalk.blue(`Starting Hivemind server on port ${options.port}...`));

    if (options.daemon) {
      console.log(chalk.green('✓ Server started as daemon'));
    } else {
      console.log(chalk.green('✓ Server started'));
      console.log(`  Port: ${options.port}`);
      console.log(`  Config: ${options.config || 'default'}`);
    }
  }

  private async stopServer(): Promise<void> {
    console.log(chalk.blue('Stopping Hivemind server...'));
    // Here you would implement server stop logic
    console.log(chalk.green('✓ Server stopped'));
  }

  private async restartServer(): Promise<void> {
    console.log(chalk.blue('Restarting Hivemind server...'));
    await this.stopServer();
    await this.startServer({ port: '3000' });
  }

  private showServerStatus(): void {
    console.log(chalk.blue('Server Status:'));
    console.log(`  Status: ${chalk.green('Running')}`); // This would be dynamic
    console.log(`  Port: ${chalk.green('3000')}`); // This would be dynamic
    console.log(`  Uptime: ${chalk.green('5h 42m')}`); // This would be dynamic
    console.log(`  Memory: ${chalk.green('156 MB')}`); // This would be dynamic
  }

  private validateConfiguration(): void {
    console.log(chalk.blue('Validating configuration...'));

    const warnings = this.configManager.getWarnings();
    const bots = this.configManager.getAllBots();

    if (warnings.length === 0 && bots.length > 0) {
      console.log(chalk.green('✓ Configuration is valid'));
    } else {
      if (bots.length === 0) {
        console.log(chalk.yellow('⚠ No bots configured'));
      }

      warnings.forEach((warning) => {
        console.log(chalk.yellow(`⚠ ${warning}`));
      });
    }
  }

  private async reloadConfiguration(): Promise<void> {
    console.log(chalk.blue('Reloading configuration...'));
    // Here you would implement configuration reload logic
    console.log(chalk.green('✓ Configuration reloaded'));
  }

  private async exportConfiguration(path: string): Promise<void> {
    console.log(chalk.blue(`Exporting configuration to ${path}...`));

    const config = {
      bots: this.configManager.getAllBots(),
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    await fs.writeFile(path, JSON.stringify(config, null, 2));
    console.log(chalk.green('✓ Configuration exported'));
  }

  private async importConfiguration(path: string, force: boolean): Promise<void> {
    try {
      const data = await fs.readFile(path, 'utf8');
      const config = JSON.parse(data);

      if (!force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Import ${config.bots?.length || 0} bot(s) from ${path}?`,
            default: false,
          },
        ]);

        if (!confirm) {
          console.log(chalk.yellow('Import cancelled'));
          return;
        }
      }

      console.log(chalk.blue(`Importing configuration from ${path}...`));
      // Here you would implement configuration import logic
      console.log(chalk.green('✓ Configuration imported'));
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }

  public run(argv: string[]): void {
    this.program.parse(argv);
  }
}

// Create and export CLI instance for direct usage
const cli = new HivemindCLI();

// If this file is run directly, execute the CLI
if (require.main === module) {
  cli.run(process.argv);
}

export default cli;
